import { JwtConfig } from './jwt-auth.service.js'

type AllowedEnvironmentConfig = 'production' | 'development' | 'test'

const jwtInternalConfigLibrary: Record<AllowedEnvironmentConfig, JwtConfig> = {
    production: {
        secret: process.env.JWT_SECRET || '',
        expireTime: '15m'
    },
    development: {
        secret: process.env.JWT_SECRET || 'dev-secret-key-super-safe-and-long-12345',
        expireTime: '8h'
    },
    test: {
        secret: 'test-secret-short',
        expireTime: '5m'
    }
}

export const getJwtInternalConfig = (): JwtConfig => {
    const actualEnvironment = process.env.NODE_ENV || 'development'

    const config = jwtInternalConfigLibrary[actualEnvironment as AllowedEnvironmentConfig]

    if (actualEnvironment === 'production' && !config.secret) {
        throw new Error('Critical: JWT_SECRET env variable is missing in production environment.')
    }

    return config
} 