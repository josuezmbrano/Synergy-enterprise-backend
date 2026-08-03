import { TaskDomainError } from 'core/errors/domain/domain-classes.error.js'
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('TaskObjectiveVo creation, validation and prop testing', () => {

    it('must create a TaskObjectiveVo if all validations and requirements are correct.', () => {

        const inputObjective = 'Implement vetest unit testing in the domain layer'
        const objectiveVo = TaskObjectiveVo.create(inputObjective)

        const secondInputObjective = 'Implement vetest unit testing in the domain layer'
        const secondObjectiveVo = TaskObjectiveVo.create(secondInputObjective)

        const otherInputObjective = 'Integrate personalized Domain Errors'
        const otherObjectiveVo = TaskObjectiveVo.create(otherInputObjective)

        expect(objectiveVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(secondObjectiveVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(otherObjectiveVo.value).toBe('Integrate personalized Domain Errors')

        expect(objectiveVo).not.toEqual(otherObjectiveVo)
        expect(objectiveVo).toEqual(secondObjectiveVo)
        expect(objectiveVo).not.toBe(secondObjectiveVo)
    })

    it('must throw a REQUIRED reason value from a TaskErrorFactory method if objective input is empty.', () => {

        expectDomainError(TaskDomainError, () => TaskObjectiveVo.create(''), 4, undefined, 'REQUIRED', 'objective')
    })

    describe('Length validation error scenarios for min and max characters of objective input.', () => {

        it('must throw a LENGTH_MISMATCH reason value if min_length is less than 3 characters.', () => {

            expectDomainError(TaskDomainError, () => TaskObjectiveVo.create('bs'), 4, undefined, 'LENGTH_MISMATCH', 'objective')
        })

        it('must throw a LENGTH_MISMATCH reason value if max_length is greater than 70 characters.', () => {

            expectDomainError(TaskDomainError, () => TaskObjectiveVo.create('Integrate personalized Domain Errors. Implement vetest unit testing in a'), 4, undefined, 'LENGTH_MISMATCH', 'objective')
        })

    })

    describe('Regex validation error scenarios for objective input', () => {

        it('must throw an INVALID_CHARACTERS reason value if @ special characters are used.', () => {

            expectDomainError(TaskDomainError, () => TaskObjectiveVo.create('Integrate personalized Domain Errors @'), 4, undefined, 'INVALID_CHARACTERS', 'objective')
        })

        it('must throw an INVALID_CHARACTERS reason value if <>, /, special characters are used.', () => {

            expectDomainError(TaskDomainError, () => TaskObjectiveVo.create('</Integrate personalized Domain Errors>'), 4, undefined, 'INVALID_CHARACTERS', 'objective')
        })
    })

})