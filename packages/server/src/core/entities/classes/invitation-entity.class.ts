import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { BaseEntity } from '../base.entity.js';
import { InvitationProps } from '../props/invitation.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { InvitationStatusVo } from 'core/value-objects/invitation/invitation-status.vo.js';
import { InvitationMessageVo } from 'core/value-objects/invitation/invitation-message.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { InvitationExpirationVo } from 'core/value-objects/invitation/invitation-expiration.vo.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { InvitationStatusOptions } from '@project/common/constants/invitation.constants.js';
import { MemberRoleOptions } from '@project/common/constants/member.constants.js';

export class InvitationEntityClass extends BaseEntity<InvitationIdVo, InvitationProps> {

    private constructor(id: InvitationIdVo, props: InvitationProps, createdAt?: DateVo, updatedAt?: DateVo) {
        super(id, props, createdAt, updatedAt)
    }


    // MAIN METHODS
    public static create(props: InvitationProps, id?: InvitationIdVo): InvitationEntityClass {
        const finalId = id ? id : InvitationIdVo.create()
        return new InvitationEntityClass(finalId, { ...props },)
    }

    public static reconstitute(props: InvitationProps, id: InvitationIdVo, createdAt: DateVo, updatedAt: DateVo): InvitationEntityClass {
        return new InvitationEntityClass(id, { ...props }, createdAt, updatedAt)
    }

    // GETTERS
    public get publicId(): InvitationIdVo {
        return this._props.publicId
    }

    public get projectId(): ProjectIdVo {
        return this._props.projectId
    }

    public get invitedUserId(): UserIdVo {
        return this._props.invitedUserId
    }

    public get invitedById(): UserIdVo {
        return this._props.invitedById
    }

    public get status(): InvitationStatusVo {
        return this._props.status
    }

    public get message(): InvitationMessageVo {
        return this._props.message
    }

    public get createdAtDate(): DateVo {
        return this.createdAt
    }

    public get updatedAtDate(): DateVo {
        return this.updatedAt
    }

    public get expiresAtDate(): InvitationExpirationVo {
        return this._props.expiresAt
    }

    public get targetRole(): MemberRoleVo {
        return this._props.targetRole
    }


    // TO PRIMITIVES METHOD

    public toPrimitives() {
        return {
            id: this.id.value,
            publicId: this._props.publicId.value,
            projectId: this._props.projectId.value,
            invitedUserId: this._props.invitedUserId.value,
            invitedById: this._props.invitedById.value,
            status: this._props.status.value as InvitationStatusOptions,
            message: this._props.message.value,
            targetRole: this._props.targetRole.value as MemberRoleOptions,
            expiresAt: this._props.expiresAt.value,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value
        }
    }


    // PRIVATE HELPERS ////////////////////////////////////////////////////////
    private ensureIsValid(targetStatus: string, currentStatus: InvitationStatusVo): void {

        if (!this._props.status.isPending()) {
            throw InvitationErrorFactory.invitationInvalidTransition(
                `Error: Cannot change invitation status to ${targetStatus} because its current status is ${currentStatus.value}. Only PENDING invitations can be processed.`,
                {
                    propToModify: 'status',
                    reason: 'INVALID_STATE_TRANSITION',
                    constraint: 'only_pending_invitations_can_be_processed.'
                }
            )
        }

    }


    // AUTHORIZATION
    // USED IN USECASES
    public ensureCanBeValidated(): void {

        if (this._props.expiresAt.isExpired()) throw InvitationErrorFactory.invitationExpired()

        if (!this._props.status.isPending()) throw InvitationErrorFactory.invitationAlreadyProcessed()
    }


    // UPDATE ENTITY /////////////////////////////////////////////////////////////////////////

    // STATUS PROPS METHODS ///////////////////////////////////////////////////
    public moveToAccepted() {

        const statusTarget = InvitationStatusVo.create('accepted')

        if (this._props.status.equals(statusTarget)) return

        this.ensureIsValid(InvitationStatusVo.ACCEPTED, this._props.status)

        this._props.status = statusTarget 
        this.markAsUpdated()
    }

    public moveToRejected() {

        const statusTarget = InvitationStatusVo.create('rejected')
        if (this._props.status.equals(statusTarget)) return

        this.ensureIsValid(InvitationStatusVo.REJECTED, this._props.status)

        this._props.status = statusTarget
        this.markAsUpdated()
    }


    // EXPIRED AUTOMATIC UNIQUE METHOD ////////////////////////////////////////
    public markAsExpired() {

        if (!this._props.status.isPending()) return 
        
        if (this._props.expiresAt.isExpired()) {
            this._props.status = InvitationStatusVo.create('expired')
            this.markAsUpdated()
        }
    }
}