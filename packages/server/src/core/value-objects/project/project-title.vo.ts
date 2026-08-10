import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { PROJECT_CONSTRAINTS } from '@project/common/constants/project.constants.js';

export class ProjectTitleVo extends BaseValueObject<string> {


    private constructor(value: string) {
        super(value)
    }

    public static create(name: string): ProjectTitleVo {

        const sanitizedTitle = (name ?? '').trim()

        if (!sanitizedTitle) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'title',
                receivedValue: sanitizedTitle,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Project title cannot be empty'
            })
        }

        if (sanitizedTitle.length < PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH || sanitizedTitle.length > PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'title',
                receivedValue: sanitizedTitle,
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH} / max_length: ${PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH}`,
                description: `Project title length must be ${PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH} to ${PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH} characters long`
            })
        }


        if (!PROJECT_CONSTRAINTS.TITLE_REGEX_FORMAT.test(sanitizedTitle)) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'title',
                receivedValue: sanitizedTitle,
                reason: 'INVALID_CHARACTERS',
                constraint: 'alphanumeric, spaces and (._-) only',
                description: 'Unauthorized special characters or symbols. Only alphanumeric characters and basic punctuation (., -, _) are allowed'
            })
        }

        return new ProjectTitleVo(sanitizedTitle)
    }

    public get normalized(): string {
        return this.value.toLowerCase()
    }
}