import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { TASK_CONSTRAINTS } from '@project/common/constants/task.constants.js'

export class TaskDescriptionVo extends BaseValueObject<string, 'TaskDescriptionVo'> {

    protected readonly voType = 'TaskDescriptionVo' as const

    private constructor(value: string) {
        super(value)
    }

    public static create(description: string): TaskDescriptionVo {

        const sanitizedDescription = (description ?? '').trim()

        if (!sanitizedDescription) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'description',
                receivedValue: sanitizedDescription,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Task description cannot be empty'
            })
        }

        if (sanitizedDescription.length < TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH || sanitizedDescription.length > TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'description',
                receivedValue: sanitizedDescription,
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} / max_length: ${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}`,
                description: `Task description length must be between ${TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} to ${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters long`
            })
        }

        if (!TASK_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT.test(sanitizedDescription)) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'description',
                receivedValue: sanitizedDescription,
                reason: 'INVALID_CHARACTERS',
                constraint: 'angle brackets are not allowed',
                description: 'Descriptions cannot contain angle brackets (< or >). Please use standard text, emojis, and line breaks.'
            })
        }

        return new TaskDescriptionVo(sanitizedDescription)
    }

}