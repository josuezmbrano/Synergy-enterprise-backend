import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { BaseEntity } from '../base.entity.js';
import { UserProps } from '../props/user.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserStatusOptions } from '@project/common/constants/user.constants.js';

export class UserEntityClass extends BaseEntity<UserIdVo, UserProps> {

    get entityType(): string {
        return 'User'
    }

    private constructor(props: UserProps, id: UserIdVo, createdAt?: DateVo, updatedAt?: DateVo) {
        super(id, props, createdAt, updatedAt)
    }



    // MAIN METHODS
    public static create(props: UserProps, id?: UserIdVo): UserEntityClass {

        const finalId = id ? id : UserIdVo.create()
        return new UserEntityClass({ ...props }, finalId)
    }

    public static reconstitute(props: UserProps, id: UserIdVo, createdAt: DateVo, updatedAt: DateVo): UserEntityClass {
        return new UserEntityClass({ ...props }, id, createdAt, updatedAt)
    }


    public get isValidated() {
        return !!this._props.verifiedAt
    }

    public get publicId() {
        return this._props.publicId
    }

    public get password() {
        return this._props.password
    }

    public get fullname() {
        return this._props.name.value + ' ' + this._props.lastname.value
    }

    public get name() {
        return this._props.name
    }

    public get lastname() {
        return this._props.lastname
    }

    public get username() {
        return this._props.username
    }

    public get status() {
        return this._props.status
    }

    public get updatedAtDate() {
        return this.updatedAt
    }

    public get verifiedAtDate() {
        return this._props.verifiedAt
    }

    public get createdAtDate() {
        return this.createdAt
    }

    public get usernameUpdatedAtDate() {
        return this._props.usernameUpdatedAt
    }

    public get email() {
        return this._props.email
    }

    // TO PRIMITIVES METHOD

    public toPrimitives() {
        return {
            id: this.id.value,
            publicId: this._props.publicId.value,
            username: this._props.username.value,
            name: this._props.name.value,
            lastname: this._props.lastname.value,
            email: this._props.email.value,
            password: this._props.password.value,
            status: this._props.status.value as UserStatusOptions,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value,
            usernameUpdatedAt: this._props.usernameUpdatedAt?.value ?? null,
            verifiedAt: this._props.verifiedAt?.value ?? null
        }
    }


    // PRIVATE HELPERS ////////////////////////////////////////////////////////
    private ensureUserNotSuspended(propToModify: string) {
        if (this._props.status.isSuspended()) {
            throw UserErrorFactory.userSuspendedLocked({
                user: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'USER_ACCOUNT_SUSPENDED',
                constraint: 'suspended_users_cannot_perform_actions'
            })
        }
    }

    private ensureLimitPermitted(propToModify: string) {
        if (this._props.usernameUpdatedAt) {

            const thirtyDays = new Date()
            thirtyDays.setDate(thirtyDays.getDate() - 30);
            thirtyDays.setHours(0, 0, 0, 0)

            const userUpdateDate = new Date(this._props.usernameUpdatedAt.toISO())
            userUpdateDate.setHours(0, 0, 0, 0)

            if (userUpdateDate >= thirtyDays) {
                throw UserErrorFactory.userUsernameChangeLimit({
                    user: this._props.publicId.value,
                    propToModify: propToModify,
                    reason: 'USERNAME_CHANGE_COOLDOWN',
                    constraint: 'max_one_change_per_thirty_days'
                })
            }

        }
    }

    private ensureUserVerified() {
        if (this._props.status.isPendingVerification()) {
            throw UserErrorFactory.userNotVerified({
                user: this._props.publicId.value,
                reason: 'USER_VERIFICATION_REQUIRED',
                constraint: 'unverified_account_restricted_actions'
            })
        }
    }
    ///////////////////////////////////////////////////////////////////////////
    // BUSINESS LOGIC METHODS

    // AUTHORIZATION 
    // USED IN USECASES
    public ensureCanOperate(): void {
        if (!this._props.status.isActive()) {
            throw UserErrorFactory.userNotActiveForAction()
        }
    }

    public ensureCanLogin(): void {
        if (this._props.status.isSuspended()) {
            throw UserErrorFactory.userSuspendedLocked()
        }
    }

    public ensureIsStillPending(): void {
        if (!this._props.status.isPendingVerification()) {
            throw UserErrorFactory.userAlreadyActive()
        }
    }

    public ensureCanViewPlatform(): void {

        if (this._props.status.isSuspended()) {
            throw UserErrorFactory.userSuspendedLocked()
        }

        if (this._props.status.isPendingVerification()) {
            throw UserErrorFactory.userNotVerified()
        }
    }

    public ensureCanAcceptAdminRole(adminRolesByUser: number): void {
        if (adminRolesByUser === 5) {
            throw UserErrorFactory.userMaxAdminRolesReached()
        }
    }


    // CONSULT INFORMATION
    // USED TO PASS INFO TO DIFFERENT ENTITIES
    public isVerified(): boolean {
        return this._props.status.isActive()
    }


    // UPDATE ENTITY /////////////////////////////////////////////////////////////////////////

    // USERNAME PROP METHODS //////////////////////////////////////////////////
    public updateUsername(newUsername: UserUsernameVo) {

        this.ensureUserNotSuspended('username')
        this.ensureLimitPermitted('username')

        if (this._props.username.equals(newUsername)) return

        this._props.username = newUsername
        this._props.usernameUpdatedAt = DateVo.create()
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // NAME PROP METHODS //////////////////////////////////////////////////////
    public updateName(newName: UserNameVo) {

        this.ensureUserNotSuspended('name')

        if (this._props.name.equals(newName)) return

        this._props.name = newName
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // LASTNAME PROP METHODS //////////////////////////////////////////////////
    public updateLastname(newLastname: UserLastnameVo) {

        this.ensureUserNotSuspended('lastname')

        if (this._props.lastname.equals(newLastname)) return

        this._props.lastname = newLastname
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // EMAIL PROP METHODS /////////////////////////////////////////////////////
    public updateEmail(newEmail: UserEmailVo) {

        this.ensureUserNotSuspended('email')

        if (this._props.email.equals(newEmail)) return

        this._props.email = newEmail
        this._props.verifiedAt = null

        if (this._props.status.isActive()) {
            this._props.status = UserStatusVo.create('pending_verification')
        }

        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // PASSWORD PROP METHODS //////////////////////////////////////////////////
    public updatePassword(newPassword: UserPasswordVo) {

        this.ensureUserNotSuspended('password')
        this.ensureUserVerified()

        this._props.password = newPassword
        this.markAsUpdated()
    }

    public resetPassword(newPassword: UserPasswordVo) {

        this._props.password = newPassword
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // STATUS PROP METHODS ////////////////////////////////////////////////////
    public moveToActive() {

        const statusTarget = UserStatusVo.create('active')

        if (this._props.status.equals(statusTarget)) return

        this._props.verifiedAt = (this._props.status.isSuspended() && this._props.verifiedAt)
            ? this._props.verifiedAt : DateVo.create()

        this._props.status = statusTarget
        this.markAsUpdated()
    }

    public moveToSuspended() {

        const statusTarget = UserStatusVo.create('suspended')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this.markAsUpdated()
    }

    public moveToPending() {

        const statusTarget = UserStatusVo.create('pending_verification')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this._props.verifiedAt = null
        this.markAsUpdated()
    }

    public verifyEmail() {

        const statusTarget = UserStatusVo.create('active')

        if (!this._props.status.isPendingVerification()) return

        this._props.status = statusTarget
        this._props.verifiedAt = DateVo.create()
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
}