import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { bootstrapLogger } from 'infrastructure/config/modules/logger.config.js'


let container: StartedPostgreSqlContainer
let mailpitContainer: StartedTestContainer

export async function setup() {

    try {

        // POSTGRESQL CONTAINER SETUP
        bootstrapLogger.info('🐳 [Testcontainers] Starting an ephemeral PostgreSQL container...')

        container = await new PostgreSqlContainer('postgres:17-alpine')
            .withDatabase('enterprise_test_db')
            .withUser('postgres')
            .withPassword('test_password')
            .start();

        const databaseUrl = container.getConnectionUri();

        process.env.INTERNAL_TEST_BASE_URL = databaseUrl;

        bootstrapLogger.info({ databaseUrl }, '✅ [Testcontainers] Postgres global container set up')
        bootstrapLogger.info('🚀 [Setup Global] Waiting for test files to initialize their schemas... \n');


        // MAILPIT CONTAINER SETUP
        bootstrapLogger.info('\n🐳 [MailPitContainer] Starting an ephemeral Mailpit container...')

        mailpitContainer = await new GenericContainer('axllent/mailpit:v1.21')
            .withExposedPorts(1025, 8025)
            .start()

        const smtpPort = mailpitContainer.getMappedPort(1025)
        const apiHttpPort = mailpitContainer.getMappedPort(8025)
        const host = mailpitContainer.getHost()

        process.env.TEST_MAILPIT_SMTP_PORT = smtpPort.toString()
        process.env.TEST_MAILPIT_HTTP_PORT = apiHttpPort.toString()
        process.env.TEST_MAILPIT_HOST = host

        bootstrapLogger.info({ host, smtpPort, httpPort: apiHttpPort }, '✅ [MailPitContainer] Mailpit set up successfully.');


    } catch (error) {
        bootstrapLogger.error(error, '❌ Fatal error during global containers configuration:');
        if (container) await container.stop();
        if (mailpitContainer) await mailpitContainer.stop()
        process.exit(1);
    }

    return async () => {
        bootstrapLogger.info('\n🛑 [Testcontainers] Shutting down and destroying global containers...');
        await Promise.all([
            container?.stop(),
            mailpitContainer.stop()
        ])
        bootstrapLogger.info('🗑️ [Testcontainers] Cleanly removed all containers.');
    };
}