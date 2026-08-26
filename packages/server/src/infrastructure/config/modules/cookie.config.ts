import { Env } from "../env.schema.js"


export interface CookieOptionsConfig {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    path: string
    maxAge: number
}


export const getCookieConfig = (env: Env): CookieOptionsConfig => {

    const isProduction = env.NODE_ENV === 'production'

    return Object.freeze({
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? ('strict' as const) : ('lax' as const),
        path: '/',
        maxAge: {
            production: 15 * 60 * 1000,
            development: 8 * 60 * 60 * 1000,
            test: 5 * 60 * 1000
        }[env.NODE_ENV]
    })
}
