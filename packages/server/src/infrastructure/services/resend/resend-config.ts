type AllowedEnvironmentConfig = 'production' | 'development'

export interface ResendConfig {
    apiKey: string,
    from: string,
    overridesTo?: string
}


const resendInternalConfigLibrary: Record<AllowedEnvironmentConfig, ResendConfig> = {
    production: {
        apiKey: process.env.RESEND_API_KEY || '',
        from: 'Verified real domain',
    },
    development: {
        apiKey: process.env.RESEND_API_KEY || '',
        from: 'Acme <onboarding@resend.dev>',
        overridesTo: process.env.DEV_PERSONAL_EMAIL
    }
}

export const getResendConfig = (): ResendConfig => {
    const actualEnvironment = process.env.NODE_ENV || 'development'

    const config = resendInternalConfigLibrary[actualEnvironment as AllowedEnvironmentConfig]

    if ((actualEnvironment === 'production' || actualEnvironment === 'development') && !config.apiKey) {
        throw new Error('Critical: RESEND_API_KEY env variable is missing in environment.')
    }

    return config
}