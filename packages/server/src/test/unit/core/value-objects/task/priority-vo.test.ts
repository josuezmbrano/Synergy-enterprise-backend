import { TaskDomainError } from 'core/errors/domain/domain-classes.error.js'
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('TaskPriorityVo creation, validation and prop testing.', () => {

    it('must create a TaskPriorityVo if all requirements and validations are correct.', () => {

        const inputPriority = 'low'
        const priorityVo = TaskPriorityVo.create(inputPriority)

        const secondInputPriority = 'low'
        const secondPriorityVo = TaskPriorityVo.create(secondInputPriority)

        const otherInputPriority = 'medium'
        const otherPriorityVo = TaskPriorityVo.create(otherInputPriority)

        const thirdInputPriority = 'critical'
        const thirdPriorityVo = TaskPriorityVo.create(thirdInputPriority)

        expect(priorityVo.value).toBe('LOW')
        expect(secondPriorityVo.value).toBe('LOW')
        expect(otherPriorityVo.value).toBe('MEDIUM')
        expect(thirdPriorityVo.value).toBe('CRITICAL')

        expect(priorityVo).not.toEqual(otherPriorityVo)
        expect(priorityVo).toEqual(secondPriorityVo)
        expect(priorityVo).not.toBe(secondPriorityVo)
    })

    it('must throw a REQUIRED reason value if priority input is an empty string.', () => {

        expectDomainError(TaskDomainError, () => TaskPriorityVo.create(''), 4, undefined, 'REQUIRED', 'priority')
    })

    it('must throw a PRIORITY_NOT_ALLOWED reason value if priority input received does not match any of the allowed priorities', () => {

        expectDomainError(TaskDomainError, () => TaskPriorityVo.create('pending_validation'), 4, undefined, 'PRIORITY_NOT_ALLOWED', 'priority')
    })

    describe('Test priority identification methods.', () => {

        it('should identify as LOW', () => {

            const priorityVo = TaskPriorityVo.create('low')
            expect(priorityVo.isLow()).toBe(true)
            expect(priorityVo.isMedium()).toBe(false)
            expect(priorityVo.isHigh()).toBe(false)
            expect(priorityVo.isCritical()).toBe(false)
        })

        it('should identify as MEDIUM', () => {

            const priorityVo = TaskPriorityVo.create('medium')
            expect(priorityVo.isLow()).toBe(false)
            expect(priorityVo.isMedium()).toBe(true)
            expect(priorityVo.isHigh()).toBe(false)
            expect(priorityVo.isCritical()).toBe(false)
        })

        it('should identify as HIGH', () => {

            const priorityVo = TaskPriorityVo.create('high')
            expect(priorityVo.isLow()).toBe(false)
            expect(priorityVo.isMedium()).toBe(false)
            expect(priorityVo.isHigh()).toBe(true)
            expect(priorityVo.isCritical()).toBe(false)
        })

        it('should identify as CRITICAL', () => {

            const priorityVo = TaskPriorityVo.create('critical')
            expect(priorityVo.isLow()).toBe(false)
            expect(priorityVo.isMedium()).toBe(false)
            expect(priorityVo.isHigh()).toBe(false)
            expect(priorityVo.isCritical()).toBe(true)
        })
    })

})