type AllowedEnvironmentConfig = 'production' | 'development' | 'test'

export interface ServerPortConfig {
    port: number
}

const serverInternalConfigLibrary: Record<AllowedEnvironmentConfig, ServerPortConfig> = {
    production: {
        port: parseInt(process.env.PORT || '', 10)
    },
    development: {
        port: 3000
    },
    test: {
        port: 0
    }
}

export const getServerConfig = (): ServerPortConfig => {
    const actualEnvironment = process.env.NODE_ENV || 'development'

    const config = serverInternalConfigLibrary[actualEnvironment as AllowedEnvironmentConfig]

    if (actualEnvironment === 'production' && !config.port) {
        throw new Error('Critical: PORT environment variable is missing. Application failed to bind to any port in production mode.')
    }

    return config
}