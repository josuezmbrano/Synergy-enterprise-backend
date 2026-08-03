import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('UserLastnameVo creation, validation and prop testing in UserLastnameVo Class.', () => {

    it('must create a UserLastnameVo if validation and requirements are correct', () => {

        const inputUserLastname = 'Zambrano Plaza'
        const UserLastnameVO = UserLastnameVo.create(inputUserLastname)

        const secondInputUserLastname = 'Zambrano Plaza'
        const secondUserLastnameVo = UserLastnameVo.create(secondInputUserLastname)

        const otherInputUserLastname = 'Rodriguez Ceguera'
        const otherUserLastnameVo = UserLastnameVo.create(otherInputUserLastname)

        expect(UserLastnameVO.value).toBe('Zambrano Plaza')
        expect(secondUserLastnameVo.value).toBe('Zambrano Plaza')
        expect(otherUserLastnameVo.value).toBe('Rodriguez Ceguera')

        expect(UserLastnameVO).not.toEqual(otherUserLastnameVo)
        expect(UserLastnameVO).toEqual(secondUserLastnameVo)
        expect(UserLastnameVO).not.toBe(secondUserLastnameVo)
    })

    it('must throw a REQUIRED reason value if lastname input is an empty string', () => {

        expectDomainError(UserDomainError, () => UserLastnameVo.create(''), 4, undefined, 'REQUIRED', 'lastname')
    })

    describe('Length validation error scenarios for min and max characters requirements', () => {

        it('must throw a LENGTH_MISMATCH reason value if min_length is less than 2 characters', () => {

            expectDomainError(UserDomainError, () => UserLastnameVo.create('b'), 4, undefined, 'LENGTH_MISMATCH', 'lastname')
        })

        it('must throw a LENGTH_MISMATCH reason value if max length is greater than 50 characters', () => {

            expectDomainError(UserDomainError, () => UserLastnameVo.create('Villarrubia Ciguenza Altamirano Sotomayor Fernández'), 4, undefined, 'LENGTH_MISMATCH', 'lastname')
        })
    })

    describe('Regex validation error scenarios for lastname input', () => {

        it('must throw an INVALID_CHARACTERS reason value if name contains numbers', () => {

            expectDomainError(UserDomainError, () => UserLastnameVo.create('Zambrano123'), 4, undefined, 'INVALID_CHARACTERS', 'lastname')
        })

        it('must throw an INVALID_CHARACTERS reason value if punctuation or commas are used', () => {

            expectDomainError(UserDomainError, () => UserLastnameVo.create('Pla,z.a'), 4, undefined, 'INVALID_CHARACTERS', 'lastname')
        })
    })
})