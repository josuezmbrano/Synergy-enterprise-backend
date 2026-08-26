import { NodemailService } from 'infrastructure/mailing/nodemailer/nodemailer-testing.service.js';
import { mailpit } from 'test/clients/mailpit.client.js';
import { PinoLoggerAdapter } from 'infrastructure/logging/pino-logger.adapter.js';
import { createContainer } from 'infrastructure/container/di.config.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { getNodemailerConfig } from 'infrastructure/config/modules/nodemailer-testing.config.js';
import { Env } from 'infrastructure/config/env.schema.js';


describe('Integration test - Database connection', () => {
    let pinoLogger: PinoLoggerAdapter
    let prisma: PrismaClient
    let environment: Env

    beforeAll(() => {
        // Instanciamos el contenedor o extraemos las dependencias de infraestructura necesarias para la suite
        const env = getEnv()
        const container = createContainer(env);
        environment = container.environment.env
        prisma = container.prisma
        pinoLogger = container.loggerMonitorInstance.pinoLogger;
    });

    it('should connect to Docker and execute a basic Postgres query.', async () => {

        await expect(prisma.$connect()).resolves.not.toThrow();
        pinoLogger.info('🟢 Direct connection to the Docker container established.');

        const result = await prisma.$queryRaw`SELECT version();`;

        pinoLogger.info('\n📊 Query result from Docker container\n', { dbVersion: result });

        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Array);

        await prisma.$disconnect();
    });


    it('should send an email through SMTP and capture it inside Mailpit container via HTTP API.', async () => {
        pinoLogger.info('\n🐳 [Test-Mailpit] Initializing NodemailService with dynamic config...');

        const mailService = new NodemailService(getNodemailerConfig(environment));

        const testEmailOptions = {
            to: 'test-vanguard@synergy.com',
            template: 'REGISTER_VERIFICATION' as const,
            data: {
                fullname: 'Vanguard Tester',
                token: '9999'
            }
        };

        pinoLogger.info('📧 Sending ephemeral email through NodemailService...', { recipient: testEmailOptions.to });

        await expect(mailService.sendEmail(testEmailOptions)).resolves.not.toThrow();
        pinoLogger.info('📩 Email sent to SMTP port successfully.');

        pinoLogger.info('🔍 Querying Mailpit HTTP API to assert delivery...');

        const list = await mailpit.listMessages();

        pinoLogger.info('\n📬 Messages captured in Mailpit inbox', { totalCaptured: list.total });


        expect(list.total).toBeGreaterThanOrEqual(1);


        const lastEmail = list.messages[0];

        pinoLogger.info('📝 Inspecting last captured message metadata', {
            from: lastEmail.From.Address,
            to: lastEmail.To[0].Address,
            subject: lastEmail.Subject
        })

        expect(lastEmail.To[0].Address).toBe(testEmailOptions.to);
        expect(lastEmail.Subject).toBe('🔐 Account confirmation - Synergy security code');

        if (lastEmail.Snippet) {
            expect(lastEmail.Snippet).toContain('9999');
        }

        pinoLogger.info('🟢 Mailpit delivery and retrieval pipeline verified successfully.');
    });
});