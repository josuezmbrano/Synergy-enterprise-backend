import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('UserStatusVo creation, validation and prop testing', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    it('must create an UserStatusVo if all requirements, allowed status and validations are correct in status input', () => {

        const inputStatus = 'active'
        const statusVo = UserStatusVo.create(inputStatus)

        const secondInputStatus = 'active'
        const secondStatusVo = UserStatusVo.create(secondInputStatus)

        const otherInputStatus = 'suspended'
        const otherStatusVo = UserStatusVo.create(otherInputStatus)

        const thirdInputStatus = 'pending_verification'
        const thirdStatusVo = UserStatusVo.create(thirdInputStatus)

        expect(statusVo.value).toBe('ACTIVE')
        expect(secondStatusVo.value).toBe('ACTIVE')
        expect(otherStatusVo.value).toBe('SUSPENDED')
        expect(thirdStatusVo.value).toBe('PENDING_VERIFICATION')

        expect(statusVo).not.toEqual(otherStatusVo)
        expect(statusVo).toEqual(secondStatusVo)
        expect(statusVo).not.toBe(secondStatusVo)
    })

    it('must throw a REQUIRED reason value if status input is an empty string', () => {

        expectDomainError(UserDomainError, () => UserStatusVo.create(''), 4, undefined, 'REQUIRED', 'status')
    })

    it('must throw a STATUS_NOT_ALLOWED reason value if status received does not match allowed status', () => {

        expectDomainError(UserDomainError, () => UserStatusVo.create('pending_validation'), 4, undefined, 'STATUS_NOT_ALLOWED', 'status')
    })

    describe('Test status identification methods', () => {

        it('should correctly identify as ACTIVE status', () => {

            const statusVo = UserStatusVo.create('active')
            expect(statusVo.isActive()).toBe(true)
            expect(statusVo.isSuspended()).toBe(false)
            expect(statusVo.isPendingVerification()).toBe(false)
        })

        it('should correctly identify as SUSPENDED status', () => {

            const statusVo = UserStatusVo.create('suspended')
            expect(statusVo.isActive()).toBe(false)
            expect(statusVo.isSuspended()).toBe(true)
            expect(statusVo.isPendingVerification()).toBe(false)
        })

        it('should correctly identify as PENDING_VERIFICATION status', () => {

            const statusVo = UserStatusVo.create('pending_verification')
            expect(statusVo.isActive()).toBe(false)
            expect(statusVo.isSuspended()).toBe(false)
            expect(statusVo.isPendingVerification()).toBe(true)
        })

    })
})