import prisma from 'infrastructure/lib/prisma.js';
import { nodemailerConfig } from 'infrastructure/config/modules/nodemailer-testing.config.js';
import { NodemailService } from 'infrastructure/mailing/nodemailer/nodemailer-testing.service.js';
import { mailpit } from 'test/clients/mailpit.client.js';
import { containerDI } from 'infrastructure/container/di.config.js';

const pinoLogger = containerDI.loggerMonitorInstance.pinoLogger

describe('Integration test - Database connection', () => {

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

        const mailService = new NodemailService(nodemailerConfig);

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