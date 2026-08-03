import { ProjectDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('ProjectDescriptionVo creation, validation and prop testing.', () => {

    it('must create a ProjectDescriptionVo if all validations and requirements are correct.', () => {

        const inputDescription = 'Implement vetest unit testing in the domain layer'
        const descriptionVo = ProjectDescriptionVo.create(inputDescription)

        const secondInputDescription = 'Implement vetest unit testing in the domain layer'
        const secondDescriptionVo = ProjectDescriptionVo.create(secondInputDescription)

        const otherInputDescription = 'Integrate personalized Domain Errors'
        const otherDescriptionVo = ProjectDescriptionVo.create(otherInputDescription)

        expect(descriptionVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(secondDescriptionVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(otherDescriptionVo.value).toBe('Integrate personalized Domain Errors')

        expect(descriptionVo).not.toEqual(otherDescriptionVo)
        expect(descriptionVo).toEqual(secondDescriptionVo)
        expect(descriptionVo).not.toBe(secondDescriptionVo)
    })

    it('must throw a LENGTH_MISMATCH reason value if description exceeds max_length greater than 1000 characters.', () => {

        const longDescription = 'a'.repeat(1001)
        expectDomainError(ProjectDomainError, () => ProjectDescriptionVo.create(longDescription), 4, undefined, 'LENGTH_MISMATCH', 'description')
    })

    it('must throw an INVALID_CHARACTERS reason value if Regex validation fails on description input with <> angle brackets.', () => {

        expectDomainError(ProjectDomainError, () => ProjectDescriptionVo.create('<Integrate personalized Domain Errors with classes and factories>'), 4, undefined, 'INVALID_CHARACTERS', 'description')
    })

})