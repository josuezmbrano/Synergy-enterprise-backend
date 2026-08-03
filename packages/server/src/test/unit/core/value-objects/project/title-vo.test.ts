import { ProjectDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('ProjectTitleVo creation, validation and prop testing', () => {

    it('must create a projectTitleVo if all validations and requirements are correct.', () => {

        const inputTitle = 'Implement vetest unit testing in the domain layer'
        const titleVo = ProjectTitleVo.create(inputTitle)

        const secondInputTitle = 'Implement vetest unit testing in the domain layer'
        const secondTitleVo = ProjectTitleVo.create(secondInputTitle)

        const otherInputTitle = 'Integrate personalized Domain Errors'
        const otherTitleVo = ProjectTitleVo.create(otherInputTitle)

        expect(titleVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(secondTitleVo.value).toBe('Implement vetest unit testing in the domain layer')
        expect(otherTitleVo.value).toBe('Integrate personalized Domain Errors')

        expect(titleVo).not.toEqual(otherTitleVo)
        expect(titleVo).toEqual(secondTitleVo)
        expect(titleVo).not.toBe(secondTitleVo)
    })

    it('must throw a REQUIRED reason value from a ProjectErrorFactory method if title input is empty.', () => {

        expectDomainError(ProjectDomainError, () => ProjectTitleVo.create(''), 4, undefined, 'REQUIRED', 'title')
    })

    describe('Length validation error scenarios for min and max characters of title input.', () => {

        it('must throw a LENGTH_MISMATCH reason value if min_length is less than 3 characters.', () => {

            expectDomainError(ProjectDomainError, () => ProjectTitleVo.create('bs'), 4, undefined, 'LENGTH_MISMATCH', 'title')
        })

        it('must throw a LENGTH_MISMATCH reason value if max_length is greater than 50 characters.', () => {

            expectDomainError(ProjectDomainError, () => ProjectTitleVo.create('Integrate personalized Domain Errors. Implement vet'), 4, undefined, 'LENGTH_MISMATCH', 'title')
        })

    })

    describe('Regex validation error scenarios for title input', () => {

        it('must throw an INVALID_CHARACTERS reason value if @ special characters are used.', () => {

            expectDomainError(ProjectDomainError, () => ProjectTitleVo.create('Integrate personalized Domain Errors @'), 4, undefined, 'INVALID_CHARACTERS', 'title')
        })

        it('must throw an INVALID_CHARACTERS reason value if <>, /, special characters are used.', () => {

            expectDomainError(ProjectDomainError, () => ProjectTitleVo.create('</Integrate personalized Domain Errors>'), 4, undefined, 'INVALID_CHARACTERS', 'title')
        })
    })

})

