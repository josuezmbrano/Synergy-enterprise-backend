import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { BaseEntity } from '../base.entity.js';
import { MemberProps } from '../props/member.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleOptions, MemberStatusOptions } from '@project/common/constants/member.constants.js'



export class MemberEntityClass extends BaseEntity<MemberIdVo, MemberProps> {

    get entityType(): string {
        return 'Member'
    }

    private readonly _userPublicId?: UserIdVo

    private constructor(props: MemberProps, id: MemberIdVo, createdAt?: DateVo, updatedAt?: DateVo, userPublicId?: UserIdVo) {
        super(id, props, createdAt, updatedAt)
        this._userPublicId = userPublicId
    }


    // MAIN METHODS

    public static create(props: MemberProps, id?: MemberIdVo): MemberEntityClass {

        const finalId = id ? id : MemberIdVo.create()
        return new MemberEntityClass({ ...props }, finalId)
    }

    public static reconstitute(props: MemberProps, id: MemberIdVo, createdAt: DateVo, updatedAt: DateVo, userPublicId?: UserIdVo): MemberEntityClass {
        return new MemberEntityClass({ ...props }, id, createdAt, updatedAt, userPublicId)
    }

    public get userPublicId(): UserIdVo | undefined {
        return this._userPublicId
    }

    public get publicId() {
        return this._props.publicId
    }

    public get projectId() {
        return this._props.projectId
    }

    public get userId() {
        return this._props.userId
    }

    public get status() {
        return this._props.status
    }

    public get role() {
        return this._props.role
    }

    public get joinedAtDate() {
        return this._props.joinedAt
    }

    public get updatedAtDate() {
        return this.updatedAt
    }

    public get createdAtDate() {
        return this.createdAt
    }

    // TO PRIMITIVES METHOD

    public toPrimitives() {
        return {
            id: this.id.value,
            publicId: this._props.publicId.value,
            projectId: this._props.projectId.value,
            userId: this._props.userId.value,
            userPublicId: this._userPublicId?.value,
            role: this._props.role.value as MemberRoleOptions,
            status: this._props.status.value as MemberStatusOptions,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value,
            joinedAt: this._props.joinedAt.value
        }
    }


    // PRIVATE HELPERS ////////////////////////////////////////////////////////
    private ensureMemberIsActive(propToModify: string): void {
        if (!this._props.status.isActive()) {
            throw MemberErrorFactory.memberNotActive({
                propToModify: propToModify,
                reason: 'MEMBER_REQUIRES_ACTIVATION',
                constraint: 'cannot_update_member_not_active'
            })
        }
    }


    ///////////////////////////////////////////////////////////////////////////////
    // BUSINESS LOGIC METHODS

    // AUTHORIZATION 
    // USED IN USECASES
    public ensureIsAdmin(): void {
        if (!this._props.role.isAdmin()) {
            throw MemberErrorFactory.memberCreateForbidden()
        }
    }

    public ensureisActive() {
        if (!this._props.status.isActive()) {
            throw MemberErrorFactory.memberNotActive()
        }
    }


    // CONSULT INFORMATION
    // USED TO PASS INFO TO DIFFERENT ENTITIES
    public hasPrivileges(): boolean {
        return this._props.role.isAdmin()
    }

    public canAccessProject(): boolean {
        return this._props.status.isActive() || this._props.status.isOnLeave()
    }


    // UPDATE ENTITY /////////////////////////////////////////////////////////////////////////

    // ROLE PROP METHODS //////////////////////////////////////////////////////
    public moveToAdmin() {

        this.ensureMemberIsActive('role')

        const roleTarget = MemberRoleVo.create('admin')

        if (this._props.role.equals(roleTarget)) return

        this._props.role = roleTarget
        this.markAsUpdated()
    }

    public moveToContributor() {

        this.ensureMemberIsActive('role')

        const roleTarget = MemberRoleVo.create('contributor')

        if (this._props.role.equals(roleTarget)) return

        this._props.role = roleTarget
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // STATUS PROP METHODS ////////////////////////////////////////////////////
    public moveToOnLeave() {

        this.ensureMemberIsActive('status')

        const statusTarget = MemberStatusVo.create('on_leave')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this.markAsUpdated()
    }

    public moveToInactive() {

        const statusTarget = MemberStatusVo.create('inactive')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this._props.role.isAdmin() ? this._props.role = MemberRoleVo.create('contributor') : this._props.role
        this.markAsUpdated()
    }

    public moveToActive() {

        const statusTarget = MemberStatusVo.create('active')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this.markAsUpdated()
    }


}