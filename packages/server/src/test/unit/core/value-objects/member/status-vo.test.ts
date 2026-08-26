import { MemberDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('MemberStatusVo creation, validation and prop testing.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    it('must create a MemberStatusVo if all requirements and validations are correct.', () => {

        const inputStatus = 'active'
        const statusVo = MemberStatusVo.create(inputStatus)

        const secondInputStatus = 'active'
        const secondStatusVo = MemberStatusVo.create(secondInputStatus)

        const otherInputStatus = 'inactive'
        const otherStatusVo = MemberStatusVo.create(otherInputStatus)

        expect(statusVo.value).toBe('ACTIVE')
        expect(secondStatusVo.value).toBe('ACTIVE')
        expect(otherStatusVo.value).toBe('INACTIVE')

        expect(statusVo).not.toEqual(otherStatusVo)
        expect(statusVo).toEqual(secondStatusVo)
        expect(statusVo).not.toBe(secondStatusVo)
    })

    it('must throw a REQUIRED reason value if status input is an empty string.', () => {

        expectDomainError(MemberDomainError, () => MemberStatusVo.create(''), 4, undefined, 'REQUIRED', 'status')
    })

    it('must throw a STATUS_NOT_ALLOWED reason value if status input received does not match any of the allowed status', () => {

        expectDomainError(MemberDomainError, () => MemberStatusVo.create('pending_validation'), 4, undefined, 'STATUS_NOT_ALLOWED', 'status')
    })

    describe('Test status identification methods.', () => {

        it('should identify as ACTIVE', () => {

            const statusVo = MemberStatusVo.create('active')
            expect(statusVo.isActive()).toBe(true)
            expect(statusVo.isInactive()).toBe(false)
            expect(statusVo.isOnLeave()).toBe(false)
        })

        it('should identify as INACTIVE', () => {

            const statusVo = MemberStatusVo.create('inactive')
            expect(statusVo.isActive()).toBe(false)
            expect(statusVo.isInactive()).toBe(true)
            expect(statusVo.isOnLeave()).toBe(false)
        })

        it('should identify as ON_LEAVE', () => {

            const statusVo = MemberStatusVo.create('on_leave')
            expect(statusVo.isActive()).toBe(false)
            expect(statusVo.isInactive()).toBe(false)
            expect(statusVo.isOnLeave()).toBe(true)
        })

    })

})