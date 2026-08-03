import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js'

describe('TokenTypeVo creation and prop testing.', () => {

    it('must create an EMAIL_VERIFICATION or PASSWORD_RESET TokenTypeVo.', () => {

        const emailTypeVo = TokenTypeVo.createEmailVerification()
        const emailTypeVo2 = TokenTypeVo.createEmailVerification()
        const passwordTypeVo = TokenTypeVo.createPasswordReset()

        expect(emailTypeVo.value).toBe('EMAIL_VERIFICATION')
        expect(passwordTypeVo.value).toBe('PASSWORD_RESET')
        expect(emailTypeVo).not.toEqual(passwordTypeVo)
        expect(emailTypeVo).toEqual(emailTypeVo2)
        expect(emailTypeVo).not.toBe(emailTypeVo2)
    })

    it('should identify as an EMAIL_VERIFICATION type vo', () => {

        const emailTypeVo = TokenTypeVo.createEmailVerification()
        expect(emailTypeVo.isEmailVerification()).toBe(true)
    })

})