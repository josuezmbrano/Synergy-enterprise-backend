import { MemberDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('MemberEntityClass creation, methods testing and core logic.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    describe('Creation, reconstitution, and basic calculation testing.', () => {

        it('must create a valid MemberEntity instance correctly.', () => {

            const memberEntity = MemberMother.createDefault()

            expect(memberEntity.role.isContributor()).toBe(true)
            expect(memberEntity.status.isActive()).toBe(true)
            expect(memberEntity.joinedAtDate).not.toBeNull()
        })

        it('must reconstitute a valid MemberEntity instance correctly.', () => {

            const memberEntity = MemberMother.reconstituteDefault()

            expect(memberEntity.id.value).toBe('550e8400-e29b-41d4-a716-446655440000')
            expect(memberEntity.role.isContributor()).toBe(true)
            expect(memberEntity.joinedAtDate).not.toBeNull()
        })

        it('should correctly return true in hasPrivileges() if current role is admin', () => {

            const memberEntity = MemberMother.reconstituteAdmin()

            expect(memberEntity.role.isAdmin()).toBe(true)
            expect(memberEntity.hasPrivileges()).toBe(true)
        })

        it('should correctly return true in canAccessProject() if current member status is either active or onleave', () => {

            const memberEntityOne = MemberMother.reconstituteDefault()
            expect(memberEntityOne.canAccessProject()).toBe(true)

            const memberEntityTwo = MemberMother.reconstituteOnLeave()
            expect(memberEntityTwo.canAccessProject()).toBe(true)
        })

    })

    describe('Update entity core logic', () => {

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        describe('Update member role to ADMIN', () => {

            it('should correctly update member role to admin and mark updatedAt timestamp field', () => {

                const memberEntity = MemberMother.reconstituteDefault()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToAdmin()
                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.role.isAdmin()).toBe(true)
            })


            it('should not execute any updates if member to update is already in an admin role state', () => {

                const memberEntity = MemberMother.reconstituteAdmin()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToAdmin()
                expect(memberEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })

        })

        describe('Update member role to CONTRIBUTOR', () => {

            it('should correctly update member role to contributor and mark updatedAt timestamp field', () => {

                const memberEntity = MemberMother.reconstituteAdmin()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToContributor()
                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.role.isContributor()).toBe(true)
            })


            it('should not execute any updates if member to update is already in an contributor role state', () => {

                const memberEntity = MemberMother.reconstituteDefault()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToContributor()

                expect(memberEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(memberEntity.role.isContributor()).toBe(true)
            })

        })

        describe('Update member status to ON_LEAVE', () => {

            it('should correctly update member status to on_leave and mark updatedAt timestamp field', () => {

                const memberEntity = MemberMother.reconstituteDefault()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToOnLeave()
                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.status.isOnLeave()).toBe(true)
            })

        })

        describe('Update member status to INACTIVE', () => {

            it('should correctly update member status to inactive, and mark updatedAt timestamp field', () => {

                const memberEntity = MemberMother.reconstituteDefault()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToInactive()

                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.status.isInactive()).toBe(true)
                expect(memberEntity.role.isContributor()).toBe(true)
            })

            it('should ensure an Admin is demoted to Contributor when moved to Inactive, but a Contributor remains a Contributor', () => {

                const memberEntity = MemberMother.reconstituteAdmin()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToInactive()

                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.status.isInactive()).toBe(true)
                expect(memberEntity.role.isContributor()).toBe(true)
            })

            it('should not execute any updates if member to update is already in an inactive status state', () => {

                const memberEntity = MemberMother.reconstituteInactive()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToInactive()
                expect(memberEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(memberEntity.status.isInactive()).toBe(true)
            })
        })

        describe('Update member status to ACTIVE', () => {

            it('should correctly update member status to active, and mark updatedAt timestamp field', () => {

                const memberEntity = MemberMother.createDefault({ status: MemberStatusVo.create('inactive') })
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToActive()
                expect(memberEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(memberEntity.status.isActive()).toBe(true)
            })

            it('should not execute any updates if member to update is already in an active status state', () => {

                const memberEntity = MemberMother.reconstituteDefault()
                const previousUpdatedAt = memberEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                memberEntity.moveToActive()
                expect(memberEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(memberEntity.status.isActive()).toBe(true)
            })
        })
    })

    describe('Data integrity verification', () => {

        it('should return a primitive object with all values correctly synced to VO', () => {

            const memberEntity = MemberMother.reconstituteDefault()
            const memberPrimitives = memberEntity.toPrimitives()

            expect(memberEntity.id.value).toEqual(memberPrimitives.id)
            expect(memberEntity.publicId.value).toEqual(memberPrimitives.publicId)
            expect(memberEntity.projectId.value).toEqual(memberPrimitives.projectId)
            expect(memberEntity.userId.value).toEqual(memberPrimitives.userId)
            expect(memberEntity.userPublicId?.value).toEqual(memberPrimitives.userPublicId)
            expect(memberEntity.role.value).toEqual(memberPrimitives.role)
            expect(memberEntity.status.value).toEqual(memberPrimitives.status)
            expect(memberEntity.createdAtDate.value.getTime()).toEqual(memberPrimitives.createdAt.getTime())
            expect(memberEntity.updatedAtDate.value.getTime()).toEqual(memberPrimitives.updatedAt.getTime())
            expect(memberEntity.joinedAtDate.value.getTime()).toEqual(memberPrimitives.joinedAt.getTime())
        })
    })

    describe('Authorization guards logic', () => {

        it('should throw a MemberDomain memberCreateForbidden error if current member role is not admin', () => {

            const memberEntity = MemberMother.reconstituteDefault()
            expectDomainError(MemberDomainError, () => memberEntity.ensureIsAdmin(), 3, 'MEMBER_NOT_PERMITTED_TO_CREATE')
        })

        it('should throw a MemberDomain memberNotActive error if current member status is not active.', () => {

            const memberEntity = MemberMother.reconstituteInactive()
            expectDomainError(MemberDomainError, () => memberEntity.ensureisActive(), 3, 'MEMBER_NOT_ACTIVE')
        })
    })

})