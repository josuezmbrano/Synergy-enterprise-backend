import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS, ALLOWED_USER_STATUS } from '@project/common/constants/user.constants.js'

export class UserStatusVo extends BaseValueObject<string> {


    public static readonly ACTIVE = USER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.ACTIVE
    public static readonly SUSPENDED = USER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.SUSPENDED
    public static readonly PENDING_VERIFICATION = USER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.PENDING_VERIFICATION


    private constructor(value: string) {
        super(value)
    }

    public static create(status: string): UserStatusVo {

        const sanitizedStatus = (status ?? '').trim().toUpperCase()

        if (!sanitizedStatus) {
            throw UserErrorFactory.userValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'User status cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_USER_STATUS as readonly string[]).includes(sanitizedStatus)

        if (!isAllowed) {
            throw UserErrorFactory.userValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'STATUS_NOT_ALLOWED',
                constraint: `Allowed status: ${ALLOWED_USER_STATUS.join(', ')}`,
                description: 'User status must be one of allowed values from the user status list only'
            })
        }

        return new UserStatusVo(sanitizedStatus)
    }

    public isActive(): boolean {
        return this._props === UserStatusVo.ACTIVE
    }

    public isSuspended(): boolean {
        return this._props === UserStatusVo.SUSPENDED
    }

    public isPendingVerification(): boolean {
        return this._props === UserStatusVo.PENDING_VERIFICATION
    }

}