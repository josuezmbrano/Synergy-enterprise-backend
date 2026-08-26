import { TaskDomainError } from 'core/errors/domain/domain-classes.error.js'
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('TaskStatusVo creation, validation and prop testing.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    it('must create a TaskStatusVo if all requirements and validations are correct.', () => {

        const inputStatus = 'todo'
        const statusVo = TaskStatusVo.create(inputStatus)

        const secondInputStatus = 'todo'
        const secondStatusVo = TaskStatusVo.create(secondInputStatus)

        const otherInputStatus = 'doing'
        const otherStatusVo = TaskStatusVo.create(otherInputStatus)

        const thirdInputStatus = 'overdue'
        const thirdStatusVo = TaskStatusVo.create(thirdInputStatus)

        expect(statusVo.value).toBe('TODO')
        expect(secondStatusVo.value).toBe('TODO')
        expect(otherStatusVo.value).toBe('DOING')
        expect(thirdStatusVo.value).toBe('OVERDUE')

        expect(statusVo).not.toEqual(otherStatusVo)
        expect(statusVo).toEqual(secondStatusVo)
        expect(statusVo).not.toBe(secondStatusVo)
    })

    it('must throw a REQUIRED reason value if status input is an empty string.', () => {

        expectDomainError(TaskDomainError, () => TaskStatusVo.create(''), 4, undefined, 'REQUIRED', 'status')
    })

    it('must throw a STATUS_NOT_ALLOWED reason value if status input received does not match any of the allowed status', () => {

        expectDomainError(TaskDomainError, () => TaskStatusVo.create('pending_validation'), 4, undefined, 'STATUS_NOT_ALLOWED', 'status')
    })

    describe('Test status identification boolean methods.', () => {

        it('should identify as TODO', () => {

            const statusVo = TaskStatusVo.create('todo')
            expect(statusVo.isTodo()).toBe(true)
            expect(statusVo.isDoing()).toBe(false)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isReview()).toBe(false)
            expect(statusVo.isOverDue()).toBe(false)
        })

        it('should identify as DOING', () => {

            const statusVo = TaskStatusVo.create('doing')
            expect(statusVo.isTodo()).toBe(false)
            expect(statusVo.isDoing()).toBe(true)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isReview()).toBe(false)
            expect(statusVo.isOverDue()).toBe(false)
        })

        it('should identify as REVIEW', () => {

            const statusVo = TaskStatusVo.create('review')
            expect(statusVo.isTodo()).toBe(false)
            expect(statusVo.isDoing()).toBe(false)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isReview()).toBe(true)
            expect(statusVo.isOverDue()).toBe(false)
        })

        it('should identify as COMPLETED', () => {

            const statusVo = TaskStatusVo.create('completed')
            expect(statusVo.isTodo()).toBe(false)
            expect(statusVo.isDoing()).toBe(false)
            expect(statusVo.isCompleted()).toBe(true)
            expect(statusVo.isReview()).toBe(false)
            expect(statusVo.isOverDue()).toBe(false)
        })

        it('should identify as OVERDUE', () => {

            const statusVo = TaskStatusVo.create('overdue')
            expect(statusVo.isTodo()).toBe(false)
            expect(statusVo.isDoing()).toBe(false)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isReview()).toBe(false)
            expect(statusVo.isOverDue()).toBe(true)
        })
    })
})