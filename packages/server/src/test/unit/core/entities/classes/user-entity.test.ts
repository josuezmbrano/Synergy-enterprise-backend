import { UserDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js'
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js'
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js'
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js'
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { createContainer } from 'infrastructure/container/di.config.js'
import { UserMother } from 'test/builders/user.mother.js'
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'

describe('UserEntityClass creation, methods testing and core logic', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Creation, Reconstitution and basic calculations testing', () => {

        it('must create a valid UserEntity instance correctly.', () => {

            const userEntity = UserMother.create()

            expect(userEntity.email.value).toBe('josue@example.com')
            expect(userEntity.username.value).toBe('josue_dev')
            expect(userEntity.password.value).toBe('Hash_Safe_123!')
        })

        it('must reconstitute a valid UserEntity instance correctly.', () => {

            const userEntityReconstituted = UserMother.reconstituteDefault()

            expect(userEntityReconstituted.email.value).toBe('moises@example.com')
            expect(userEntityReconstituted.username.value).toBe('moises_dev')
            expect(userEntityReconstituted.password.value).toBe('Hash_123!')
            expect(userEntityReconstituted.id.value).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
        })

        it('must return the full name if it is correctly concatenated', () => {

            const userEntity = UserMother.create()

            expect(userEntity.fullname).toBe('Josue Zambrano')
        })

        it('must correctly return true in isValidated() if verifiedAt has a value', () => {

            const userEntityReconstituted = UserMother.reconstituteDefault()

            expect(userEntityReconstituted.isValidated).toBe(true)

        })
    })

    describe('Update entity core logic', () => {

        describe('Username update', () => {

            it('should correctly update username and mark usernameUpdatedAt and updatedAt fields on entity', () => {

                const userEntityReconstituted = UserMother.reconstituteDefault({ usernameUpdatedAt: null })
                const previousUpdatedAt = userEntityReconstituted.updatedAtDate.value

                vi.advanceTimersByTime(10000)

                userEntityReconstituted.updateUsername(UserUsernameVo.create('bugsbunny'))

                expect(userEntityReconstituted.username.value).toBe('bugsbunny')
                expect(userEntityReconstituted.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt.getTime())
                expect(userEntityReconstituted.usernameUpdatedAtDate).not.toEqual(null)

            })

            it('should throw an USER_ACCOUNT_SUSPENDED reason if user suspended tries to update username', () => {

                const userEntity = UserMother.createSuspended()
                expectDomainError(UserDomainError, () => userEntity.updateUsername(UserUsernameVo.create('moises_dev')), 4, 'USER_SUSPENDED_LOCKED', 'USER_ACCOUNT_SUSPENDED')
            })

            it('should throw an USERNAME_CHANGE_COOLDOWN reason if username change limit is exceeded.', () => {

                const userEntity = UserMother.reconstituteDefault()
                expectDomainError(UserDomainError, () => userEntity.updateUsername(UserUsernameVo.create('bugsbunn')), 4, 'USER_USERNAME_CHANGE_LIMIT', 'USERNAME_CHANGE_COOLDOWN')
            })

            it('should validate that update timestamp fields have not changed if value is the same', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()
                const previousUsernameUpdatedAt = userEntity.usernameUpdatedAtDate?.value.getTime()

                vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 31)

                userEntity.updateUsername(UserUsernameVo.create('moises_dev'))
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(userEntity.usernameUpdatedAtDate?.value.getTime()).toEqual(previousUsernameUpdatedAt)
            })
        })

        describe('Name update', () => {

            it('should correctly update name and mark updatedAt field con entity', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateName(UserNameVo.create('david'))
                expect(userEntity.fullname).toBe('David Zambrano')
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw an USER_ACCOUNT_SUSPENDED reason if an user suspended tries to update name', () => {

                const userEntity = UserMother.createSuspended()
                expectDomainError(UserDomainError, () => userEntity.updateName(UserNameVo.create('David')), 4, 'USER_SUSPENDED_LOCKED', 'USER_ACCOUNT_SUSPENDED')
            })

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateName(UserNameVo.create('Moises'))
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Lastname update', () => {

            it('should correctly update lastname and mark updatedAt field con entity', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateLastname(UserLastnameVo.create('Plaza'))
                expect(userEntity.fullname).toBe('Moises Plaza')
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw an USER_ACCOUNT_SUSPENDED reason if an user suspended tries to update lastname', () => {

                const userEntity = UserMother.createSuspended()
                expectDomainError(UserDomainError, () => userEntity.updateLastname(UserLastnameVo.create('Plaza')), 4, 'USER_SUSPENDED_LOCKED', 'USER_ACCOUNT_SUSPENDED')
            })

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateLastname(UserLastnameVo.create('Zambrano'))
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Email update', () => {

            it('should correctly update email and mark updatedAt field, status to PENDING_VERIFICATION and verifiedAt to null', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateEmail(UserEmailVo.create('david@example.com'))

                expect(userEntity.email.value).toBe('david@example.com')
                expect(userEntity.status.isPendingVerification()).toBe(true)
                expect(userEntity.isValidated).toBe(false)
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw an USER_ACCOUNT_SUSPENDED reason if an user suspended tries to update email', () => {

                const userEntity = UserMother.createSuspended()
                expectDomainError(UserDomainError, () => userEntity.updateEmail(UserEmailVo.create('david@example.com')), 4, 'USER_SUSPENDED_LOCKED', 'USER_ACCOUNT_SUSPENDED')
            })

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updateEmail(UserEmailVo.create('moises@example.com'))
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Password update', () => {

            it('should correctly update password and mark updatedAt field con entity', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.updatePassword(UserPasswordVo.create('Hash_1234!'))
                expect(userEntity.password.value).toBe('Hash_1234!')
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw an USER_ACCOUNT_SUSPENDED reason if an user suspended tries to update password', () => {

                const userEntity = UserMother.createSuspended()
                expectDomainError(UserDomainError, () => userEntity.updatePassword(UserPasswordVo.create('Hash_1234!')), 4, 'USER_SUSPENDED_LOCKED', 'USER_ACCOUNT_SUSPENDED')
            })

            it('should throw an USER_VERIFICATION_REQUIRED reason if an user unverified tries to update password', () => {

                const userEntity = UserMother.createPending()
                expectDomainError(UserDomainError, () => userEntity.updatePassword(UserPasswordVo.create('Hash_1234!')), 4, 'USER_NOT_VERIFIED', 'USER_VERIFICATION_REQUIRED')
            })
        })

        it('should reset password correctly and mark updatedAt on entity', () => {

            const userEntity = UserMother.reconstituteDefault()
            const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

            vi.advanceTimersByTime(10000)

            userEntity.resetPassword(UserPasswordVo.create('Hash_12345!'))
            expect(userEntity.password.value).toBe('Hash_12345!')
            expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
        })

        describe('Status update to ACTIVE', () => {

            it('should correctly update status to active, mark verifiedAt and updatedAt on entity', () => {

                const userEntity = UserMother.create()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToActive()
                expect(userEntity.status.isActive()).toBe(true)
                expect(userEntity.isValidated).toBe(true)
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToActive()
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })

            it('should only mark updatedAt field if user is suspended and already had a verifiedAt value', () => {

                const userEntity = UserMother.createSuspended()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()
                const previousVerifiedAt = userEntity.verifiedAtDate?.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToActive()

                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(userEntity.verifiedAtDate?.value.getTime()).toEqual(previousVerifiedAt)
                expect(userEntity.status.isActive()).toBe(true)
            })
        })

        describe('Status update to SUSPENDED', () => {

            it('should correctly update status to suspended, and updatedAt field on entity', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToSuspended()
                expect(userEntity.status.isSuspended()).toBe(true)
                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.createSuspended()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToSuspended()
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Status update to PENDING_VERIFICATION', () => {

            it('should validate that update timestamps fields have not changed if value is the same', () => {

                const userEntity = UserMother.createPending()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToPending()
                expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })

            it('should correctly update status to PENDING_VERIFICATION, mark verifiedAt as null and updatedAt on entity', () => {

                const userEntity = UserMother.reconstituteDefault()
                const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                userEntity.moveToPending()

                expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(userEntity.isValidated).toBe(false)
                expect(userEntity.status.isPendingVerification()).toBe(true)
            })
        })

    })

    describe('Verify Email logic', () => {

        it('should correctly update status to active and mark verifiedAt and updatedAt fields', () => {

            const userEntity = UserMother.create()
            const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

            vi.advanceTimersByTime(10000)

            userEntity.verifyEmail()

            expect(userEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            expect(userEntity.status.isActive()).toBe(true)
            expect(userEntity.isValidated).toBe(true)
        })

        it('should validate that no changes are applied if current status is not PENDING_VERIFICATION', () => {

            const userEntity = UserMother.reconstituteDefault()
            const previousUpdatedAt = userEntity.updatedAtDate.value.getTime()

            vi.advanceTimersByTime(10000)

            userEntity.verifyEmail()
            expect(userEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
        })
    })

    describe('Data integrity verification', () => {

        it('should return a primitive object with all values correctly synced as VO', () => {

            const userEntity = UserMother.reconstituteDefault()
            const userPrimitives = userEntity.toPrimitives()

            expect(userEntity.id.value).toEqual(userPrimitives.id)
            expect(userEntity.publicId.value).toEqual(userPrimitives.publicId)
            expect(userEntity.username.value).toEqual(userPrimitives.username)
            expect(userEntity.name.value).toEqual(userPrimitives.name)
            expect(userEntity.lastname.value).toEqual(userPrimitives.lastname)
            expect(userEntity.email.value).toEqual(userPrimitives.email)
            expect(userEntity.password.value).toEqual(userPrimitives.password)
            expect(userEntity.status.value).toEqual(userPrimitives.status)
            expect(userEntity.createdAtDate.value.getTime()).toEqual(userPrimitives.createdAt.getTime())
            expect(userEntity.updatedAtDate.value.getTime()).toEqual(userPrimitives.updatedAt.getTime())
            expect(userEntity.usernameUpdatedAtDate?.value.getTime()).toEqual(userPrimitives.usernameUpdatedAt?.getTime())
            expect(userEntity.verifiedAtDate?.value.getTime()).toEqual(userPrimitives.verifiedAt?.getTime())
        })
    })

    describe('Authorization guards logic', () => {

        it('should throw an UserDomain userNotActiveForAction error if current status is not active', () => {

            const userEntity = UserMother.create()
            expectDomainError(UserDomainError, () => userEntity.ensureCanOperate(), 3, 'USER_NOT_ACTIVE_FOR_ACTION')
        })

        it('should throw an UserDomain userSuspendedLocked error if status is suspended', () => {

            const userEntity = UserMother.createSuspended()
            expectDomainError(UserDomainError, () => userEntity.ensureCanLogin(), 3, 'USER_SUSPENDED_LOCKED')
        })

        it('should throw an UserDomain userAlreadyActive error if current status is not pending_verification', () => {

            const userEntity = UserMother.reconstituteDefault()
            expectDomainError(UserDomainError, () => userEntity.ensureIsStillPending(), 3, 'USER_ALREADY_ACTIVE')
        })

        it('should throw an UserDomain userSuspendedLocked error if current status is suspended', () => {

            const userEntity = UserMother.createSuspended()
            expectDomainError(UserDomainError, () => userEntity.ensureCanViewPlatform(), 3, 'USER_SUSPENDED_LOCKED')
        })

        it('should throw an UserDomain userNotVerified error if current status is pending_verification', () => {

            const userEntity = UserMother.createPending()
            expectDomainError(UserDomainError, () => userEntity.ensureCanViewPlatform(), 3, 'USER_NOT_VERIFIED')
        })

        it('should throw an UserDomain userMaxAdminRolesReached error if current admin roles by user is 5', () => {

            const userEntity = UserMother.reconstituteDefault()

            const act = () => userEntity.ensureCanAcceptAdminRole(4)
            expect(act).not.toThrow()

            expectDomainError(UserDomainError, () => userEntity.ensureCanAcceptAdminRole(5), 4, 'USER_MAX_ADMIN_ROLES_REACHED')
        })
    })

})