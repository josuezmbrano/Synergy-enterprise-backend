import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_STATUS_OPTIONS, TASK_CONSTRAINTS } from '@project/common/constants/task.constants.js';

export class TaskStatusVo extends BaseValueObject<string, 'TaskStatusVo'> {

    protected readonly voType = 'TaskStatusVo' as const

    public static readonly TODO = TASK_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.TODO
    public static readonly DOING = TASK_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.DOING
    public static readonly REVIEW = TASK_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.REVIEW
    public static readonly COMPLETED = TASK_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.COMPLETED
    public static readonly OVERDUE = TASK_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.OVERDUE


    private constructor(value: string) {
        super(value)
    }

    public static create(status: string): TaskStatusVo {

        const sanitizedStatus = (status ?? '').trim().toUpperCase()

        if (!sanitizedStatus) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Task status cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_STATUS_OPTIONS as readonly string[]).includes(sanitizedStatus)

        if (!isAllowed) {
            throw TaskErrorFactory.taskValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'STATUS_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_STATUS_OPTIONS.join(', ')}`,
                description: 'Task status must be one of allowed values showed on status list only'
            })
        }

        return new TaskStatusVo(sanitizedStatus)
    }

    public isTodo(): boolean {
        return this._props === TaskStatusVo.TODO
    }

    public isDoing(): boolean {
        return this._props === TaskStatusVo.DOING
    }

    public isReview(): boolean {
        return this._props === TaskStatusVo.REVIEW
    }

    public isCompleted(): boolean {
        return this._props === TaskStatusVo.COMPLETED
    }

    public isOverDue(): boolean {
        return this._props === TaskStatusVo.OVERDUE
    }

}