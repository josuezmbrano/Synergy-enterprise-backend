import { ALLOWED_INVITATION_STATUS, INVITATION_CONSTRAINTS } from '@project/common/constants/invitation.constants.js';
import { BaseValueObject } from '../base.value-objects.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';

export class InvitationStatusVo extends BaseValueObject<string, 'InvitationStatusVo'> {

    protected readonly voType = 'InvitationStatusVo' as const

    public static readonly PENDING = INVITATION_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.PENDING
    public static readonly ACCEPTED = INVITATION_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.ACCEPTED
    public static readonly REJECTED = INVITATION_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.REJECTED
    public static readonly EXPIRED = INVITATION_CONSTRAINTS.STATUS_ALLOWED_OPTIONS.EXPIRED

    private constructor(value: string) {
        super(value)
    }

    public static create(status: string): InvitationStatusVo {

        const sanitizedStatus = (status ?? '').trim().toUpperCase()

        if (!sanitizedStatus) {
            throw InvitationErrorFactory.invitationValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Invitation status cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_INVITATION_STATUS as readonly string[]).includes(sanitizedStatus)

        if (!isAllowed) {
            throw InvitationErrorFactory.invitationValidationFailed({
                field: 'status',
                receivedValue: sanitizedStatus,
                reason: 'STATUS_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_INVITATION_STATUS.join(', ')}`,
                description: 'Invitation status must be one of allowed values showed on status list only'
            })
        }

        return new InvitationStatusVo(sanitizedStatus)
    }

    public isPending(): boolean {
        return this._props === InvitationStatusVo.PENDING
    }

    public isAccepted(): boolean {
        return this._props === InvitationStatusVo.ACCEPTED
    }

    public isRejected(): boolean {
        return this._props === InvitationStatusVo.REJECTED
    }

    public isExpired(): boolean {
        return this._props === InvitationStatusVo.EXPIRED
    }
}