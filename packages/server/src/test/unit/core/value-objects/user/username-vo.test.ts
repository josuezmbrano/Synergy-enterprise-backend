import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('UsernameVo creation, validation and prop testing', () => {

    it('must create an username value object if all validations and requirements are correct', () => {

        const inputUsername = 'Bugsbunny2104'
        const UsernameVo = UserUsernameVo.create(inputUsername)

        const secondInputUsername = 'Bugsbunny2104'
        const secondUsernameVo = UserUsernameVo.create(secondInputUsername)

        const otherInputUsername = 'TheZeky'
        const otherUsernameVo = UserUsernameVo.create(otherInputUsername)

        expect(UsernameVo.value).toBe('Bugsbunny2104')
        expect(secondUsernameVo.value).toBe('Bugsbunny2104')
        expect(otherUsernameVo.value).toBe('TheZeky')

        expect(UsernameVo).not.toEqual(otherUsernameVo)
        expect(UsernameVo).toEqual(secondUsernameVo)
        expect(UsernameVo).not.toBe(secondUsernameVo)

    })

    it('must throw a REQUIRED reason value if username input is an empty string', () => {

        expectDomainError(UserDomainError, () => UserUsernameVo.create(''), 4, undefined, 'REQUIRED', 'username')
    })

    describe('Length validation error scenarios for the username input value', () => {

        it('must throw a LENGTH_MISMATCH reason value if min length is less than 3 characters', () => {

            expectDomainError(UserDomainError, () => UserUsernameVo.create('bu'), 4, undefined, 'LENGTH_MISMATCH', 'username')
        })

        it('must throw a LENGTH_MISMATCH reason value if max length is more than 30 characters', () => {

            const longUsername = 'a'.repeat(31)
            expectDomainError(UserDomainError, () => UserUsernameVo.create(longUsername), 4, undefined, 'LENGTH_MISMATCH', 'username')
        })

    })

    describe('Regex validation error scenarios for the username input value', () => {

        it('must throw an INVALID_CHARACTERS reason value if blank spaces are used', () => {

            expectDomainError(UserDomainError, () => UserUsernameVo.create('Estilo AestheticVintage'), 4, undefined, 'INVALID_CHARACTERS', 'username')
        })

        it('must throw an INVALID_CHARACTERS reason value if special characters not permitted are used', () => {

            expectDomainError(UserDomainError, () => UserUsernameVo.create('josue@z#amb'), 4, undefined, 'INVALID_CHARACTERS', 'username')
        })
    })
})