import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { TASK_CONSTRAINTS } from '@project/common/constants/task.constants.js';

export class TaskObjectiveVo extends BaseValueObject<string> {

    public readonly voType = 'TaskObjectiveVo';

    private constructor(value: string) {
        super(value)
    }

    public static create(objective: string): TaskObjectiveVo {

        const sanitizedObjective = (objective ?? '').trim()

        if (!sanitizedObjective) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'objective',
                receivedValue: sanitizedObjective,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Task objective cannot be empty'
            })
        }

        if (sanitizedObjective.length < TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH || sanitizedObjective.length > TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'objective',
                receivedValue: sanitizedObjective,
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH} / max_length: ${TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH}`,
                description: `Task objective length must be ${TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH} to ${TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH} characters long`
            })
        }

        if (!TASK_CONSTRAINTS.OBJECTIVE_REGEX_FORMAT.test(sanitizedObjective)) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'objective',
                receivedValue: sanitizedObjective,
                reason: 'INVALID_CHARACTERS',
                constraint: 'alphanumeric, spaces and (._-) only',
                description: 'Unauthorized special characters or symbols. Only alphanumeric characters and basic punctuation (., -, _) are allowed'
            })
        }

        return new TaskObjectiveVo(sanitizedObjective)
    }

}