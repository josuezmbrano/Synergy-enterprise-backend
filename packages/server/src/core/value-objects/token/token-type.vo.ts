import { BaseValueObject } from '../base.value-objects.js';

export class TokenTypeVo extends BaseValueObject<string> {

    public readonly voType = 'TokenTypeVo';

    private static readonly EMAIL_VERIFICATION = 'EMAIL_VERIFICATION'
    private static readonly PASSWORD_RESET = 'PASSWORD_RESET'


    private constructor(value: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
        super(value)
    }

    public static createEmailVerification(): TokenTypeVo {
        return new TokenTypeVo(TokenTypeVo.EMAIL_VERIFICATION)
    }

    public static createPasswordReset(): TokenTypeVo {
        return new TokenTypeVo(TokenTypeVo.PASSWORD_RESET)
    }


    public isEmailVerification(): boolean {
        return this._props === TokenTypeVo.EMAIL_VERIFICATION
    }
}