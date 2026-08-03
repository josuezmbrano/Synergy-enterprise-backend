
type AllowedEnvironmentConfig = 'test'

export interface NodemailerConfig {
    host: string
    port: number
    secure: boolean,
    tls: {
        rejectUnauthorized: boolean
    }
}

const nodeMailerInternalConfig: Record<AllowedEnvironmentConfig, NodemailerConfig> = {
    test: {
        host: process.env.TEST_MAILPIT_HOST || '',
        port: parseInt(process.env.TEST_MAILPIT_SMTP_PORT || '0', 10),
        secure: false,
        tls: {
            rejectUnauthorized: false
        } 
    }
} 

export const getNodemailerConfig = (): NodemailerConfig => {
    const actualEnvironment = process.env.NODE_ENV || 'test'

    const config = nodeMailerInternalConfig[actualEnvironment as AllowedEnvironmentConfig]

    if (actualEnvironment === 'test' && (!config.host || config.port === 0)) {
        throw new Error("Critical: Mailpit host or smtp port env variable is missing in environment.")
    }

    return config
}