import { ProjectDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('ProjectStatusVo creation, validation and prop testing.', () => {

    it('must create a ProjectStatusVo if all requirements and validations are correct.', () => {

        const inputStatus = 'planned'
        const statusVo = ProjectStatusVo.create(inputStatus)

        const secondInputStatus = 'planned'
        const secondStatusVo = ProjectStatusVo.create(secondInputStatus)

        const otherInputStatus = 'completed'
        const otherStatusVo = ProjectStatusVo.create(otherInputStatus)

        const thirdInputStatus = 'archived'
        const thirdStatusVo = ProjectStatusVo.create(thirdInputStatus)

        expect(statusVo.value).toBe('PLANNED')
        expect(secondStatusVo.value).toBe('PLANNED')
        expect(otherStatusVo.value).toBe('COMPLETED')
        expect(thirdStatusVo.value).toBe('ARCHIVED')

        expect(statusVo).not.toEqual(otherStatusVo)
        expect(statusVo).toEqual(secondStatusVo)
        expect(statusVo).not.toBe(secondStatusVo)
    })

    it('must throw a REQUIRED reason value if status input is an empty string.', () => {

        expectDomainError(ProjectDomainError, () => ProjectStatusVo.create(''), 4, undefined, 'REQUIRED', 'status')
    })

    it('must throw a STATUS_NOT_ALLOWED reason value if status input received does not match any of the allowed status', () => {

        expectDomainError(ProjectDomainError, () => ProjectStatusVo.create('pending_validation'), 4, undefined, 'STATUS_NOT_ALLOWED', 'status')
    })

    describe('Test status identification methods.', () => {

        it('should identify as PLANNED', () => {

            const statusVo = ProjectStatusVo.create('planned')
            expect(statusVo.isPlanned()).toBe(true)
            expect(statusVo.isInProgress()).toBe(false)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isArchived()).toBe(false)
        })

        it('should identify as IN_PROGRESS', () => {

            const statusVo = ProjectStatusVo.create('in_progress')
            expect(statusVo.isPlanned()).toBe(false)
            expect(statusVo.isInProgress()).toBe(true)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isArchived()).toBe(false)
        })

        it('should identify as COMPLETED', () => {

            const statusVo = ProjectStatusVo.create('completed')
            expect(statusVo.isPlanned()).toBe(false)
            expect(statusVo.isInProgress()).toBe(false)
            expect(statusVo.isCompleted()).toBe(true)
            expect(statusVo.isArchived()).toBe(false)
        })

        it('should identify as ARCHIVED', () => {

            const statusVo = ProjectStatusVo.create('archived')
            expect(statusVo.isPlanned()).toBe(false)
            expect(statusVo.isInProgress()).toBe(false)
            expect(statusVo.isCompleted()).toBe(false)
            expect(statusVo.isArchived()).toBe(true)
        })

    })

})