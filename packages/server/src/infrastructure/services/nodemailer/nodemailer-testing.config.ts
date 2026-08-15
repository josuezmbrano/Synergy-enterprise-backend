import { env } from "infrastructure/config/env.config.js"


export interface NodemailerConfig {
    host: string
    port: number
    secure: boolean,
    tls: {
        rejectUnauthorized: boolean
    }
}

export const nodemailerConfig: NodemailerConfig = Object.freeze({
    host: env.TEST_MAILPIT_HOST,
    port: env.TEST_MAILPIT_SMTP_PORT,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
})