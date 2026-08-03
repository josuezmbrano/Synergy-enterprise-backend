import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('UserEmailVo creation, validation and prop testing', () => {

    it('must create an email value object if validations, format and requirements for an email address are correct.', () => {

        const inputEmail = 'josuezamb@gmail.com'
        const emailVo = UserEmailVo.create(inputEmail)

        const secondInputEmail = 'josuezamb@gmail.com'
        const secondEmailVo = UserEmailVo.create(secondInputEmail)

        const otherInputEmail = 'moiseszamb@gmail.com'
        const otherEmailVo = UserEmailVo.create(otherInputEmail)

        expect(emailVo.value).toBe('josuezamb@gmail.com')
        expect(secondEmailVo.value).toBe('josuezamb@gmail.com')
        expect(otherEmailVo.value).toBe('moiseszamb@gmail.com')

        expect(emailVo).not.toEqual(otherEmailVo)
        expect(emailVo).toEqual(secondEmailVo)
        expect(emailVo).not.toBe(secondEmailVo)

    })

    it('must throw a REQUIRED reason value on field email in UserDomainError if email input is an empty string', () => {
   
        expectDomainError(UserDomainError, () => UserEmailVo.create(''), 4, undefined, 'REQUIRED', 'email')
    })

    it('must throw a LENGTH_MISMATCH reason value on field email in a UserDomainError if max_length is higher than 254', () => {

        const longEmail = 'a'.repeat(255).concat('@gmail.com')
        expectDomainError(UserDomainError, () => UserEmailVo.create(longEmail), 4, undefined, 'LENGTH_MISMATCH', 'email')

    })

    describe('Regex validation error scenarios on field email', () => {

        it('must throw a INVALID_FORMAT reason value in a UserDomainError if special characters not permitted are added', () => {

            expectDomainError(UserDomainError, () => UserEmailVo.create('nombre(comentario)@dominio.com'), 4, undefined, 'INVALID_FORMAT', 'email')
        })

        it('must throw a INVALID_FORMAT reason value in a UserDomainError if no @ is added', () => {

            expectDomainError(UserDomainError, () => UserEmailVo.create('nombredominio.com'), 4, undefined, 'INVALID_FORMAT', 'email')
        })

        it('must throw a INVALID_FORMAT reason value in a UserDomainError if no username is added', () => {

            expectDomainError(UserDomainError, () => UserEmailVo.create('@gmail.com'), 4, undefined, 'INVALID_FORMAT', 'email')
        })

        it('must throw a INVALID_FORMAT reason value in a UserDomainError if no TLD is added', () => {

            expectDomainError(UserDomainError, () => UserEmailVo.create('josue@gmail'), 4, undefined, 'INVALID_FORMAT', 'email')
        })
    })

})