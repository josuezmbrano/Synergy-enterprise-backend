import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_MEMBER_STATUS, MEMBER_CONSTRAINTS } from '@project/common/constants/member.constants.js'

export class MemberStatusVo extends BaseValueObject<string> {


    public static readonly ACTIVE = MEMBER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.ACTIVE
    public static readonly INACTIVE = MEMBER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.INACTIVE
    public static readonly ON_LEAVE = MEMBER_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.ON_LEAVE

    private constructor(value: string) {
        super(value)
    }

    public static create(status: string): MemberStatusVo {

        const sanitizedStatus = (status ?? '').trim().toUpperCase()

        if (!sanitizedStatus) {
            throw MemberErrorFactory.memberValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Member status cannot be empty'
            })
        }


        const isAllowed = (ALLOWED_MEMBER_STATUS as readonly string[]).includes(sanitizedStatus)

        if (!isAllowed) {
            throw MemberErrorFactory.memberValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'STATUS_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_MEMBER_STATUS.join(', ')}`,
                description: 'Member status must be one of allowed values showed on status list only'
            })
        }

        return new MemberStatusVo(sanitizedStatus)
    }

    public isActive(): boolean {
        return this._props === MemberStatusVo.ACTIVE
    }

    public isInactive(): boolean {
        return this._props === MemberStatusVo.INACTIVE
    }

    public isOnLeave(): boolean {
        return this._props === MemberStatusVo.ON_LEAVE
    }

}