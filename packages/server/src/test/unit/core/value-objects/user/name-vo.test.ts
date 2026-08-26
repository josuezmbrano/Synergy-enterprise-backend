import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('User nameVo creation, validation and prop testing in UserNameVo Class.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    it('must create a nameVo if validation and requirements are correct', () => {

        const inputUserName = 'Josue Alejandro'
        const UserUserNameVo = UserNameVo.create(inputUserName)

        const secondInputUserName = 'Josue Alejandro'
        const secondUserNameVo = UserNameVo.create(secondInputUserName)

        const otherInputUserName = 'Carlos Mandril'
        const otherUserNameVo = UserNameVo.create(otherInputUserName)

        expect(UserUserNameVo.value).toBe('Josue Alejandro')
        expect(secondUserNameVo.value).toBe('Josue Alejandro')
        expect(otherUserNameVo.value).toBe('Carlos Mandril')

        expect(UserUserNameVo).not.toEqual(otherUserNameVo)
        expect(UserUserNameVo).toEqual(secondUserNameVo)
        expect(UserUserNameVo).not.toBe(secondUserNameVo)
    })

    it('must throw a REQUIRED reason value if name input is an empty string', () => {

        expectDomainError(UserDomainError, () => UserNameVo.create(''), 4, undefined, 'REQUIRED', 'name')
    })

    describe('Length validation error scenarios for min and max characters requirements', () => {

        it('must throw a LENGTH_MISMATCH reason value if min_length is less than 2 characters', () => {

            expectDomainError(UserDomainError, () => UserNameVo.create('b'), 4, undefined, 'LENGTH_MISMATCH', 'name')
        })

        it('must throw a LENGTH_MISMATCH reason value if max length is greater than 20 characters', () => {

            expectDomainError(UserDomainError, () => UserNameVo.create('María Angélica de León'), 4, undefined, 'LENGTH_MISMATCH', 'name')
        })
    })

    describe('Regex validation error scenarios for name input', () => {

        it('must throw an INVALID_CHARACTERS reason value if name contains numbers', () => {

            expectDomainError(UserDomainError, () => UserNameVo.create('Moises123'), 4, undefined, 'INVALID_CHARACTERS', 'name')
        })

        it('must throw an INVALID_CHARACTERS reason value if punctuation or commas are used', () => {

            expectDomainError(UserDomainError, () => UserNameVo.create('Mois,e.s'), 4, undefined, 'INVALID_CHARACTERS', 'name')
        })
    })
})