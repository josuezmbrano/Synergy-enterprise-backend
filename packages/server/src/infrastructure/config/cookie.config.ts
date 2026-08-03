type AllowedEnvironmentConfig = 'production' | 'development' | 'test'

interface CookieOptionsConfig {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    path: string
    maxAge: number
}

const cookieInternalConfigLibrary: Record<AllowedEnvironmentConfig, CookieOptionsConfig> = {
    production: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 * 1000
    },
    development: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000
    },
    test: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60 * 1000
    }
}

export const getCookieConfig = (): CookieOptionsConfig => {
    const actualEnvironment = process.env.NODE_ENV || 'development'

    return cookieInternalConfigLibrary[actualEnvironment as AllowedEnvironmentConfig]
}