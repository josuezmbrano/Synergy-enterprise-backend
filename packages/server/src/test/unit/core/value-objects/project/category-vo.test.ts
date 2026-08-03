import { ProjectDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('ProjectCategoryVo creation, validation and prop testing', () => {

    it('must create a ProjectCategoryVo if all validations and requirements are correct.', () => {

        const inputCategory = 'development/engineering'
        const categoryVo = ProjectCategoryVo.create(inputCategory)

        const secondInputCategory = 'development/engineering'
        const secondCategoryVo = ProjectCategoryVo.create(secondInputCategory)

        const otherInputCategory = 'design/ux'
        const otherCategoryVo = ProjectCategoryVo.create(otherInputCategory)

        expect(categoryVo.value).toBe('DEVELOPMENT/ENGINEERING')
        expect(secondCategoryVo.value).toBe('DEVELOPMENT/ENGINEERING')
        expect(otherCategoryVo.value).toBe('DESIGN/UX')

        expect(categoryVo).not.toEqual(otherCategoryVo)
        expect(categoryVo).toEqual(secondCategoryVo)
        expect(categoryVo).not.toBe(secondCategoryVo)
    })

    it('must throw a REQUIRED reason value if category input is an empty string.', () => {

        expectDomainError(ProjectDomainError, () => ProjectCategoryVo.create(''), 4, undefined, 'REQUIRED', 'category')
    })

    it('must throw a CATEGORY_NOT_ALLOWED reason value if category input received does not match any of the allowed categories.', () => {

        expectDomainError(ProjectDomainError, () => ProjectCategoryVo.create('pending_validation'), 4, undefined, 'CATEGORY_NOT_ALLOWED', 'category')
    })

})