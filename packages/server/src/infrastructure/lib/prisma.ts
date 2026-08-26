import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { PoolConfig, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import WebSocket from 'ws';
import { PrismaPg } from '@prisma/adapter-pg';
import { Env } from 'infrastructure/config/env.schema.js';

neonConfig.webSocketConstructor = WebSocket


const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const createPrismaClient = (env: Env): PrismaClient => {

    // AVOID HOT RELOADING ON DEVELOPMENT
    if (env.NODE_ENV === 'development' && globalForPrisma.prisma) return globalForPrisma.prisma

    // NATIVE TCP FOR TESTCONTAINERS LOCAL CONNECTION
    if (env.NODE_ENV === 'test') {
        const testUrl = process.env.DATABASE_URL

        if (!testUrl) throw new Error('FATAL: DATABASE_URL is missing in test environment')

        const parsedUrl = new URL(testUrl)
        const schemaName = parsedUrl.searchParams.get('schema') || 'public'

        return new PrismaClient({
            adapter: new PrismaPg(
                {
                    connectionString: testUrl,
                    options: `-c search_path=${schemaName}`
                },
                {
                    schema: schemaName
                }
            )
        })
    }

    // PRODUCTION / DEVELOPMENT NEON SERVERLESS CONNECTION
    const connectionStringUrl = env.DATABASE_URL;

    const config: PoolConfig = {
        connectionString: connectionStringUrl,
    }

    const adapter = new PrismaNeon(config)

    return new PrismaClient({
        adapter: adapter
    })

}
