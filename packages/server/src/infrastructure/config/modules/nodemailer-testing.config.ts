import { Env } from "../env.schema.js"

export interface NodemailerConfig {
    host: string
    port: number
    secure: boolean,
    tls: {
        rejectUnauthorized: boolean
    }
}

export const getNodemailerConfig = (env: Env): NodemailerConfig => {

    return Object.freeze({
        host: env.TEST_MAILPIT_HOST,
        port: env.TEST_MAILPIT_SMTP_PORT,
        secure: false,
        tls: {
            rejectUnauthorized: false
        }
    })
}