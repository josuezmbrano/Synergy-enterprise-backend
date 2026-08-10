import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { ALLOWED_MEMBER_ROLES, MEMBER_CONSTRAINTS } from '@project/common/constants/member.constants.js';

export class MemberRoleVo extends BaseValueObject<string> {


    public static readonly ADMIN = MEMBER_CONSTRAINTS.ROLE_ALLOWED_OPTIONS.ADMIN
    public static readonly CONTRIBUTOR = MEMBER_CONSTRAINTS.ROLE_ALLOWED_OPTIONS.CONTRIBUTOR


    private constructor(value: string) {
        super(value)
    }

    public static create(role: string): MemberRoleVo {

        const sanitizedRole = (role ?? '').trim().toUpperCase()

        if (!sanitizedRole) {
            throw MemberErrorFactory.memberValidationFailed({
                field: 'role',
                receivedValue: sanitizedRole,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Member role cannot be empty'
            })
        }

        const isAllowed = (ALLOWED_MEMBER_ROLES as readonly string[]).includes(sanitizedRole)

        if (!isAllowed) {
            throw MemberErrorFactory.memberValidationFailed({
                field: 'role',
                receivedValue: sanitizedRole,
                reason: 'ROLE_NOT_ALLOWED',
                constraint: `allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`,
                description: 'Member role must be one of allowed values showed on role list only'
            })
        }

        return new MemberRoleVo(sanitizedRole)
    }

    public isAdmin(): boolean {
        return this._props === MemberRoleVo.ADMIN
    }

    public isContributor(): boolean {
        return this._props === MemberRoleVo.CONTRIBUTOR
    }
}