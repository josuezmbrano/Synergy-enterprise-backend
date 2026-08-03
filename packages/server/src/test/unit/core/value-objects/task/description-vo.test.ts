import { TaskDomainError } from 'core/errors/domain/domain-classes.error.js'
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('TaskDescriptionVo creation, validation and prop testing.', () => {

    it('must create a TaskDescriptionVo if all validations and requirements are correct.', () => {

        const inputDescription = 'Implement vetest unit testing in the domain layer'
        const descriptionVo = TaskDescriptionVo.create(inputDescription)

        const secondInputDescription = 'Implement vetest unit testing in the domain layer'
        const secondDescriptionVo = TaskDescriptionVo.create(secondInputDescription)

        const otherInputDescription = 'Integrate personalized Domain Errors'
        const otherDescriptionVo = TaskDescriptionVo.create(otherInputDescription)

        expect(descriptionVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(secondDescriptionVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(otherDescriptionVo.value).toBe('Integrate personalized Domain Errors')

        expect(descriptionVo).not.toEqual(otherDescriptionVo)
        expect(descriptionVo).toEqual(secondDescriptionVo)
        expect(descriptionVo).not.toBe(secondDescriptionVo)
    })

    it('must throw a REQUIRED reason value from a TaskErrorFactory method if description input is empty.', () => {

        expectDomainError(TaskDomainError, () => TaskDescriptionVo.create(''), 4, undefined, 'REQUIRED', 'description')
    })

    describe('Length validation error scenarios for min and max characters of description input.', () => {

        it('must throw a LENGTH_MISMATCH reason value if min_length is less than 10 characters.', () => {

            expectDomainError(TaskDomainError, () => TaskDescriptionVo.create('bs nothin'), 4, undefined, 'LENGTH_MISMATCH', 'description')
        })

        it('must throw a LENGTH_MISMATCH reason value if max_length is greater than 3000 characters.', () => {

            const longDescription = 'a'.repeat(3001)
            expectDomainError(TaskDomainError, () => TaskDescriptionVo.create(longDescription), 4, undefined, 'LENGTH_MISMATCH', 'description')
        })
    })

    it('must throw an INVALID_CHARACTERS reason value if Regex validation fails on description input with <> angle brackets.', () => {

        expectDomainError(TaskDomainError, () => TaskDescriptionVo.create('<Integrate personalized Domain Errors with classes and factories>'), 4, undefined, 'INVALID_CHARACTERS', 'description')
    })

})