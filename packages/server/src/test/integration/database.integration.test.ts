import prisma from 'infrastructure/lib/prisma.js';
import { nodemailerConfig } from 'infrastructure/services/nodemailer/nodemailer-testing.config.js';
import { NodemailService } from 'infrastructure/services/nodemailer/nodemailer-testing.service.js';
import { mailpit } from 'test/clients/mailpit.client.js';

describe('Integration test - Database connection', () => {

    it('should connect to Docker and execute a basic Postgres query.', async () => {

        await expect(prisma.$connect()).resolves.not.toThrow();
        console.log('   🟢 Direct connection to the Docker container established.');

        const result = await prisma.$queryRaw`SELECT version();`;

        console.log('\n📊 Running version inside the Docker container:\n', result);

        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Array);

        await prisma.$disconnect();
    });


    it('should send an email through SMTP and capture it inside Mailpit container via HTTP API.', async () => {
        console.log('\n🐳 [Test-Mailpit] Initializing NodemailService with dynamic config...');

        const mailService = new NodemailService(nodemailerConfig);

        const testEmailInput = {
            to: 'test-vanguard@synergy.com',
            subject: '🚀 Testing Mailpit Container Integration',
            body: 'If you are reading this, the Testcontainers + Mailpit + Nodemailer pipeline is 100% working! 🔑 Token: 9999'
        };

        console.log('   📧 Sending ephemeral email through NodemailService...');
      
        await expect(mailService.sendEmail(testEmailInput)).resolves.not.toThrow();
        console.log('   📩 Email sent to SMTP port successfully.');

        console.log('   🔍 Querying Mailpit HTTP API to assert delivery...');

        const list = await mailpit.listMessages();

        console.log('\n📬 Total emails captured in Mailpit box:', list.total);

        
        expect(list.total).toBeGreaterThanOrEqual(1);

        
        const lastEmail = list.messages[0];

        console.log('   📝 Inspecting last captured message metadata:');
        console.log(`      From: ${lastEmail.From.Address}`);
        console.log(`      To: ${lastEmail.To[0].Address}`);
        console.log(`      Subject: ${lastEmail.Subject}\n`);

        expect(lastEmail.To[0].Address).toBe(testEmailInput.to);
        expect(lastEmail.Subject).toBe(testEmailInput.subject);

        if (lastEmail.Snippet) {
            expect(lastEmail.Snippet).toContain('9999');
        }

        console.log('   🟢 Mailpit delivery and retrieval pipeline verified successfully.');
    });
});