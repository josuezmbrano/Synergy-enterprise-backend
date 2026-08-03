import { IPasswordHasher } from 'core/services/password-interface.service.js';
import { hash, compare } from 'bcrypt'

export class BcryptPasswordHasher implements IPasswordHasher {

    private readonly saltRounds: number

    constructor(saltRounds: number) {
        this.saltRounds = saltRounds
    }

    async hash(plain: string): Promise<string> {
        const rounds = this.saltRounds
        return await hash(plain, rounds)
    }

    async compare(plain: string, hash: string): Promise<boolean> {
        return await compare(plain, hash)
    }
}