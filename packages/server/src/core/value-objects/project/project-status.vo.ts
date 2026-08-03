import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_PROJECT_STATUS, PROJECT_CONSTRAINTS } from '@project/common/constants/project.constants.js'

export class ProjectStatusVo extends BaseValueObject<string> {

    public readonly voType = 'ProjectStatusVo';

    public static readonly PLANNED = PROJECT_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.PLANNED
    public static readonly IN_PROGRESS = PROJECT_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.IN_PROGRESS
    public static readonly COMPLETED = PROJECT_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.COMPLETED
    public static readonly ARCHIVED = PROJECT_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.ARCHIVED

    private constructor(value: string) {
        super(value)
    }

    public static create(status: string): ProjectStatusVo {

        const sanitizedStatus = (status ?? '').trim().toUpperCase()

        if (!sanitizedStatus) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Project status cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_PROJECT_STATUS as readonly string[]).includes(sanitizedStatus)

        if (!isAllowed) {
            throw ProjectErrorFactory.projectValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'STATUS_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_PROJECT_STATUS.join(', ')}`,
                description: 'Project status must be one of allowed values showed on status list only'
            })
        }

        return new ProjectStatusVo(sanitizedStatus)
    }

    public isPlanned(): boolean {
        return this._props === ProjectStatusVo.PLANNED
    }

    public isInProgress(): boolean {
        return this._props === ProjectStatusVo.IN_PROGRESS
    }

    public isCompleted(): boolean {
        return this._props === ProjectStatusVo.COMPLETED
    }

    public isArchived(): boolean {
        return this._props === ProjectStatusVo.ARCHIVED
    }

}