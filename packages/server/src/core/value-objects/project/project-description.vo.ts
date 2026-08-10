import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { PROJECT_CONSTRAINTS } from '@project/common/constants/project.constants.js';

export class ProjectDescriptionVo extends BaseValueObject<string> {


    private constructor(value: string) {
        super(value)
    }

    public static create(description?: string): ProjectDescriptionVo {

        const sanitizedDescription = (description ?? '').trim()

        if (sanitizedDescription.length > PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'description',
                receivedValue: sanitizedDescription,
                reason: 'LENGTH_MISMATCH',
                constraint: `max_length: ${PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}`,
                description: `Project description character limit cannot exceed ${PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}`
            })
        }

        if (!PROJECT_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT.test(sanitizedDescription)) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'description',
                receivedValue: sanitizedDescription,
                reason: 'INVALID_CHARACTERS',
                constraint: 'angle brackets are not allowed',
                description: 'Descriptions cannot contain angle brackets (< or >). Please use standard text, emojis, and line breaks.'
            })
        }

        return new ProjectDescriptionVo(sanitizedDescription)
    }
}