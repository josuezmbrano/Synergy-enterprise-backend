import { getEnv } from 'infrastructure/config/env.config.js';
import { createContainer } from 'infrastructure/container/di.config.js';
import { DatabasePinger } from 'infrastructure/lib/database-pinger.js';
import request from 'supertest'
import { Express } from 'express';
import { createApp } from 'infrastructure/http/app.js';


describe('Health Checks Integration Tests', () => {

    let databasePinger: DatabasePinger
    let app: Express

    beforeAll(() => {
        const env = getEnv()
        const container = createContainer(env);
        app = createApp(container)
        databasePinger = container.healthMonitorResource.databasePinger
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /health/liveness', () => {
        it('should return 200 OK with memory metrics and process uptime', async () => {
            const response = await request(app).get('/health/liveness');

            // 1. HTTP Status & anti-cache headers
            expect(response.status).toBe(200);
            expect(response.headers['cache-control']).toContain('no-store');
            expect(response.headers['pragma']).toBe('no-cache');

            // 2. JSON response contract
            expect(response.body).toMatchObject({
                status: 'UP',
                memory: {
                    rssMB: expect.any(Number),
                    heapUsedMB: expect.any(Number),
                    heapTotalMB: expect.any(Number),
                },
            });

            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
            expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
        });
    });

    describe('GET /health/readiness', () => {
        it('should return 200 OK when database pinger succeeds', async () => {
            const response = await request(app).get('/health/readiness');

            // 1. HTTP Status & anti-cache headers
            expect(response.status).toBe(200);
            expect(response.headers['cache-control']).toContain('no-store');
            expect(response.headers['pragma']).toBe('no-cache');

            // 2. JSON success response contract
            expect(response.body).toEqual({
                status: 'UP',
                timestamp: expect.any(String),
                checks: {
                    database: {
                        status: 'UP',
                    },
                },
            });
            expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
        });

        it('should return 503 Service Unavailable when database connection fails', async () => {
            // intercepted the pinger call resolved by the DI container
            vi.spyOn(databasePinger, 'ping')
                .mockRejectedValueOnce(new Error('PostgreSQL connection dropped'));

            const response = await request(app).get('/health/readiness');

            // 1. HTTP status to indicate to the infrastructure that pauses traffic
            expect(response.status).toBe(503);
            expect(response.headers['cache-control']).toContain('no-store');

            // 2. JSON Error Response Contract with dynamic message
            expect(response.body).toEqual({
                status: 'DOWN',
                timestamp: expect.any(String),
                checks: {
                    database: {
                        status: 'DOWN',
                        error: 'PostgreSQL connection dropped',
                    },
                },
            });
        });

        it('should return 503 Service Unavailable when database query exceeds the 2000ms timeout', async () => {
            // Simulated database freezes after responding for 3000ms
            vi.spyOn(databasePinger, 'ping')
                .mockImplementationOnce(
                    () => new Promise((resolve) => setTimeout(resolve, 3000))
                );

            const response = await request(app).get('/health/readiness');

            expect(response.status).toBe(503);
            expect(response.body).toEqual({
                status: 'DOWN',
                timestamp: expect.any(String),
                checks: {
                    database: {
                        status: 'DOWN',
                        error: 'Exceeded DB timeout',
                    },
                },
            });
        });
    });

});