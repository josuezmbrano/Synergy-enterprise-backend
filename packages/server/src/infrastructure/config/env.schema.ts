import { z } from 'zod'

export const envSchema = z.object({

    // GLOBAL ENVIRONMENT
    NODE_ENV:
        z.enum(['development', 'production', 'test'],
            { error: 'NODE_ENV must be one of: development, production, test' })
            .default('development'),

    // HTTP SERVER PORT
    PORT:
        z.coerce.number({ error: 'PORT must be a valid number' })
            .int('PORT must be an integer')
            .nonnegative('PORT cannot be negative')
            .default(3000),

    // DATABASE & AUTH (REQUIRED)
    DATABASE_URL:
        z.url({ error: 'DATABASE_URL is required and must be a valid URL (e.g. postgresql://...)' }),
    JWT_SECRET:
        z.string({ error: 'JWT_SECRET is required' })
            .min(32, 'JWT_SECRET must be at least 32 characters long for minimum security'),

    // EXTERNAL PROVIDERS
    RESEND_API_KEY:
        z.string({ error: 'RESEND_API_KEY is required' })
            .min(1, 'RESEND_API_KEY cannot be empty'),
    DEV_PERSONAL_EMAIL:
        z.email({ error: 'DEV_PERSONAL_EMAIL is required' }),

    // TEST MAILPIT DEFAULTS
    TEST_MAILPIT_HOST:
        z.string({ error: 'TEST_MAILPIT_HOST must be a string' })
            .default('localhost'),
    TEST_MAILPIT_SMTP_PORT: z.coerce
        .number({ error: 'TEST_MAILPIT_SMTP_PORT must be a valid port number' })
        .int('TEST_MAILPIT_SMTP_PORT must be an integer')
        .positive('TEST_MAILPIT_SMTP_PORT must be a positive port')
        .default(1025),
    TEST_MAILPIT_HTTP_PORT: z.coerce
        .number({ error: 'TEST_MAILPIT_HTTP_PORT must be a valid port number' })
        .int('TEST_MAILPIT_HTTP_PORT must be an integer')
        .positive('TEST_MAILPIT_HTTP_PORT must be a positive port')
        .default(8025),
})

export type Env = z.infer<typeof envSchema>