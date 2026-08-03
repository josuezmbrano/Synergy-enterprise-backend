import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer } from 'testcontainers'


let container: StartedPostgreSqlContainer
let mailpitContainer: StartedTestContainer

export async function setup() {

    try {

        // POSTGRESQL CONTAINER SETUP
        console.log('\n🐳 [Testcontainers] Starting an ephemeral PostgreSQL container...');

        container = await new PostgreSqlContainer('postgres:17-alpine')
            .withDatabase('enterprise_test_db')
            .withUser('postgres')
            .withPassword('test_password')
            .start();

        const databaseUrl = container.getConnectionUri();

        process.env.INTERNAL_TEST_BASE_URL = databaseUrl;
        process.env.NODE_ENV = 'test'

        console.log(`✅ [Testcontainers] Postgres global container is set up`);
        console.log('🚀 [Setup Global] Waiting for test files to initialize their schemas... \n');


        // MAILPIT CONTAINER SETUP
        console.log('\n🐳 [MailPitContainer] Starting an ephemeral Mailpit container...')

        mailpitContainer = await new GenericContainer('axllent/mailpit:v1.21')
            .withExposedPorts(1025, 8025)
            .start()

        const smtpPort = mailpitContainer.getMappedPort(1025)
        const apiHttpPort = mailpitContainer.getMappedPort(8025)

        process.env.TEST_MAILPIT_SMTP_PORT = smtpPort.toString()
        process.env.TEST_MAILPIT_HTTP_PORT = apiHttpPort.toString()
        process.env.TEST_MAILPIT_HOST = mailpitContainer.getHost()

        console.log(`✅ [MailPitContainer] Mailpit set up. SMTP Port: ${smtpPort} | HTTP Port: ${apiHttpPort}`);


    } catch (error) {
        console.error('❌ Fatal error during global containers configuration:', error);
        if (container) await container.stop();
        if (mailpitContainer) await mailpitContainer.stop()
        process.exit(1);
    }

    return async () => {
        console.log('\n🛑 [Testcontainers] Shutting down and destroying global containers...');
        await Promise.all([
            container.stop(),
            mailpitContainer.stop()
        ])
        console.log('🗑️ [Testcontainers] Cleanly removed all containers.');
    };
}