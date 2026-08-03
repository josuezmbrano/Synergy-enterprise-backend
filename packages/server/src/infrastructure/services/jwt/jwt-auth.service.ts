import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { AuthPayload, IAuthService } from 'core/services/auth-interface.service.js';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';



const { sign, verify } = jwt;

export interface JwtConfig {
    secret: string
    expireTime: SignOptions['expiresIn']
}


export class JwtAuth implements IAuthService {

    private readonly config: JwtConfig

    constructor(config: JwtConfig) {
        this.config = config
    }

    private getConfig(): JwtConfig {
        return this.config
    }

    async generateToken(payload: AuthPayload): Promise<string> {
        return sign(payload, this.getConfig().secret, { expiresIn: this.getConfig().expireTime })
    }

    async verifyToken(token: string): Promise<AuthPayload> {

        try {
            const decoded = verify(token, this.getConfig().secret)

            if (typeof decoded === 'string' || decoded === null) {
                throw new Error('Invalid token payload')
            }

            return decoded as unknown as AuthPayload
        } catch (error) {
            throw AuthErrorFactory.invalidOrExpiredToken({ code: 'UNAUTHORIZED', slug: 'INVALID_OR_EXPIRED_TOKEN' })
        }
    }
}