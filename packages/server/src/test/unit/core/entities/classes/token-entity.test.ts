import { TokenDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('TokenEntityClass creation, methods testing and core logic.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    describe('Creation, reconstitution, and basic calculation testing.', () => {

        it('must create a valid TokenEntity instance correctly.', () => {

            const emailTokenEntity = TokenMother.createEmailVerification()
            expect(emailTokenEntity.type.isEmailVerification()).toBe(true)

            const passwordTokenEntity = TokenMother.createPasswordResetVerification()
            expect(passwordTokenEntity.type.isEmailVerification()).toBe(false)
        })

        it('must reconstitute a valid TokenEntity instance correctly.', () => {

            const emailTokenEntity = TokenMother.reconstituteDefault()
            expect(emailTokenEntity.type.isEmailVerification()).toBe(true)
            expect(emailTokenEntity.userId.value).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')

            const passwordTokenEntity = TokenMother.reconstitutePassword()
            expect(passwordTokenEntity.type.isEmailVerification()).toBe(false)
            expect(passwordTokenEntity.userId.value).toBe('3b719463-548c-4a37-9759-971c261e4792')
        })

        it('should return true in isValid() if token has not expired', () => {

            const tokenEntity = TokenMother.reconstituteDefault()
            expect(tokenEntity.isValid()).toBe(true)
        })

        it('should return false in isValid() if token has expired', () => {

            const tokenEntity = TokenMother.reconstituteExpired()
            expect(tokenEntity.isValid()).toBe(false)
        })

        it('should return true in isType() if type of token is the same as the one expected', () => {

            const tokenEntity = TokenMother.reconstitutePassword()
            expect(tokenEntity.isType(TokenTypeVo.createPasswordReset())).toBe(true)
        })

        it('should return false in isType() if type of token is not the same as the one expected', () => {

            const tokenEntity = TokenMother.reconstituteDefault()
            expect(tokenEntity.isType(TokenTypeVo.createPasswordReset())).toBe(false)
        })

        it('should return true in isOwnedBy() if token correspond to a determined user', () => {

            const tokenEntity = TokenMother.reconstituteDefault()
            expect(tokenEntity.isOwnedBy(UserIdVo.fromId('f47ac10b-58cc-4372-a567-0e02b2c3d479'))).toBe(true)
        })

        it('should return false in isOwnedBy() if token does not correspond to a determined user', () => {

            const tokenEntity = TokenMother.reconstituteDefault()
            expect(tokenEntity.isOwnedBy(UserIdVo.create())).toBe(false)
        })
    })

    describe('Authorization guards logic', () => {

        it('should throw a TokenDomain tokenExpired error if token has expired', () => {

            const tokenEntity = TokenMother.reconstituteExpired()
            expectDomainError(TokenDomainError, () => tokenEntity.ensureCanBeValidated(TokenTypeVo.createEmailVerification()), 3, 'TOKEN_EXPIRED')
        })

        it('should throw a TokenDomain tokenInvalidType error if token expected is not from the same type', () => {

            const tokenEntity = TokenMother.createPasswordResetVerification()
            expectDomainError(TokenDomainError, () => tokenEntity.ensureCanBeValidated(TokenTypeVo.createEmailVerification()), 3, 'TOKEN_INVALID_TYPE')
        })

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should throw a TokenDomain tokenCooldownLimit error if a new token have been request inside the wait time period', () => {

            const tokenEntity = TokenMother.createEmailVerification()

            vi.advanceTimersByTime(59999)

            expectDomainError(TokenDomainError, () => tokenEntity.ensureEmailCooldown(), 3, 'TOKEN_COOLDOWN_LIMIT')
        })

    })

})