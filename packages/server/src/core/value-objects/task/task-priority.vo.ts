import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_PRIORITY_OPTIONS, TASK_CONSTRAINTS } from '@project/common/constants/task.constants.js';

export class TaskPriorityVo extends BaseValueObject<string, 'TaskPriorityVo'> {

    protected readonly voType = 'TaskPriorityVo' as const

    public static readonly LOW = TASK_CONSTRAINTS.PRIORITY_ALLOWED_OPTIONS.LOW
    public static readonly MEDIUM = TASK_CONSTRAINTS.PRIORITY_ALLOWED_OPTIONS.MEDIUM
    public static readonly HIGH = TASK_CONSTRAINTS.PRIORITY_ALLOWED_OPTIONS.HIGH
    public static readonly CRITICAL = TASK_CONSTRAINTS.PRIORITY_ALLOWED_OPTIONS.CRITICAL


    private constructor(value: string) {
        super(value)
    }

    public static create(priority: string): TaskPriorityVo {

        const sanitizedPriority = (priority ?? '').trim().toUpperCase()

        if (!sanitizedPriority) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'priority',
                receivedValue: sanitizedPriority,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Task priority cannot be empty'
            })
        }

        const isAllowed = ( ALLOWED_PRIORITY_OPTIONS as readonly string[]).includes(sanitizedPriority)

        if (!isAllowed) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'priority',
                receivedValue: sanitizedPriority,
                reason: 'PRIORITY_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_PRIORITY_OPTIONS.join(', ')}`,
                description: 'Task priority must be one of allowed values showed on priority list only'
            })
        }

        return new TaskPriorityVo(sanitizedPriority)
    }

    public isLow(): boolean {
        return this._props === TaskPriorityVo.LOW
    }

    public isMedium(): boolean {
        return this._props === TaskPriorityVo.MEDIUM
    }

    public isHigh(): boolean {
        return this._props === TaskPriorityVo.HIGH
    }

    public isCritical(): boolean {
        return this._props === TaskPriorityVo.CRITICAL
    }

}