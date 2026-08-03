import { MemberDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('MemberRoleVo creation, validation and prop testing.', () => {

    it('must create a MemberRoleVo if all validations and requirements are correct.', () => {

        const inputRole = 'admin'
        const roleVo = MemberRoleVo.create(inputRole)

        const secondInputRole = 'admin'
        const secondRoleVo = MemberRoleVo.create(secondInputRole)

        const otherInputRole = 'contributor'
        const otherRoleVo = MemberRoleVo.create(otherInputRole)

        expect(roleVo.value).toBe('ADMIN')
        expect(secondRoleVo.value).toBe('ADMIN')
        expect(otherRoleVo.value).toBe('CONTRIBUTOR')

        expect(roleVo).not.toEqual(otherRoleVo)
        expect(roleVo).toEqual(secondRoleVo)
        expect(roleVo).not.toBe(secondRoleVo)
    })

    it('must throw a REQUIRED reason value if role input received is an empty string', () => {

        expectDomainError(MemberDomainError, () => MemberRoleVo.create(''), 4, undefined, 'REQUIRED', 'role')
    })

    it('must throw a ROLE_NOT_ALLOWED reason value if role input received does not match any of the allowed roles', () => {

        expectDomainError(MemberDomainError, () => MemberRoleVo.create('pending_validation'), 4, undefined, 'ROLE_NOT_ALLOWED', 'role')
    })

    describe('Test role identification boolean methods', () => {

        it('should identify as ADMIN', () => {

            const roleVo = MemberRoleVo.create('admin')
            expect(roleVo.isAdmin()).toBe(true)
            expect(roleVo.isContributor()).toBe(false)
        })

        it('should identify as CONTRIBUTOR', () => {

            const roleVo = MemberRoleVo.create('contributor')
            expect(roleVo.isAdmin()).toBe(false)
            expect(roleVo.isContributor()).toBe(true)
        })
    })

})