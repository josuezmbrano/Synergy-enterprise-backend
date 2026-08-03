import { DateVo } from '../common/date.vo.js';

export class InvitationExpirationVo extends DateVo {

    public readonly voType = 'DateVo';

    private static readonly EXPIRATION_TIME = 168

    private constructor(value: Date) {
        super(new Date(value.getTime()))
    }

    public static createDefaultExpiration(): InvitationExpirationVo {
        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + InvitationExpirationVo.EXPIRATION_TIME)
        return new InvitationExpirationVo(expirationDate)
    }

    public static fromDatabase(value: Date | string): InvitationExpirationVo {
        const date = typeof value === 'string' ? new Date(value) : value
        return new InvitationExpirationVo(date)
    }

    public get value(): Date {
        return new Date(this._props.getTime())
    }

    public isExpired(): boolean {
        return this.isBefore(DateVo.create())
    }
}