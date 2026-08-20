import { env } from 'infrastructure/config/env.config.js';
import type { SignOptions } from 'jsonwebtoken';


export interface JwtConfig {
    secret: string
    expiresIn: SignOptions['expiresIn']
}

export const jwtInternalConfig: JwtConfig = Object.freeze({
    secret: env.JWT_SECRET,
    expiresIn: {
        production: '15m' as const,
        development: '8h' as const,
        test: '5m' as const
    }[env.NODE_ENV]
})