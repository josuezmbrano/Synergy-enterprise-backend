import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_PROJECT_CATEGORIES, PROJECT_CONSTRAINTS } from '@project/common/constants/project.constants.js'

export class ProjectCategoryVo extends BaseValueObject<string, 'ProjectCategoryVo'> {


    protected readonly voType = 'ProjectCategoryVo' as const

    public static readonly DEVELOPMENT_ENGINEERING = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.DEVELOPMENT_ENGINEERING
    public static readonly DESIGN_UX = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.DESIGN_UX
    public static readonly MAINTENANCE_SUPPORT = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.MAINTENANCE_SUPPORT
    public static readonly INFRASTRUCTURE_DEVOPS = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.INFRASTRUCTURE_DEVOPS
    public static readonly DATA_ANALYSIS = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.DATA_ANALYSIS
    public static readonly MARKETING_SALES = PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS.MARKETING_SALES


    private constructor(value: string) {
        super(value)
    }

    public static create(category: string): ProjectCategoryVo {

        const sanitizedCategory = (category ?? '').trim().toUpperCase()

        if (!sanitizedCategory) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'category',
                receivedValue: sanitizedCategory,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Project category cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_PROJECT_CATEGORIES as readonly string[]).includes(sanitizedCategory)

        if (!isAllowed) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'category',
                receivedValue: sanitizedCategory,
                reason: 'CATEGORY_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_PROJECT_CATEGORIES.join(', ')}`,
                description: 'Project category must be one of allowed values showed on category list only'
            })
        }

        return new ProjectCategoryVo(sanitizedCategory)
    }

}