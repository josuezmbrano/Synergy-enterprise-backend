import { DateVo } from '../common/date.vo.js';

export class TokenExpirationVo extends DateVo {

    private static readonly EXPIRATION_TIME = 24

    private constructor(value: Date) {
        super(new Date(value.getTime()))
    }

    public static createDefaultExpiration(): TokenExpirationVo {
        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + TokenExpirationVo.EXPIRATION_TIME)
        return new TokenExpirationVo(expirationDate)
    }

    public static fromDatabase(value: Date | string): TokenExpirationVo {
        const date = typeof value === 'string' ? new Date(value) : value;
        return new TokenExpirationVo(date);
    }

    public get value() {
        return new Date(this._props.getTime())
    }

    public isExpired(): boolean {
        return this.isBefore(DateVo.create())
    }
}