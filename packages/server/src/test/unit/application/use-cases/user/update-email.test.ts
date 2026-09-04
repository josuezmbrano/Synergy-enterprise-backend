import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { UpdateEmailCase } from 'application/use-cases/user/update-email.usecase.js'
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js'
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js'
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IAuthService } from 'application/ports/auth-interface.service.js'
import { IPasswordHasher } from 'core/ports/password-interface.service.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'
import { IEventBus } from 'application/ports/event-bus.port.js'
import { UserUpdatedEmailEvent } from 'core/events/user-events/user-updated-email.event.js'

describe('UpdateEmailCase', () => {

    let sut: UpdateEmailCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>
    let mockAuthService: MockProxy<IAuthService>
    let mockEventBus: MockProxy<IEventBus>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        mockAuthService = mock<IAuthService>()
        mockEventBus = mock<IEventBus>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()


        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new UpdateEmailCase(mockUserRepository, mockTokenRepository, mockPasswordHasher, mockAuthService, mockEventBus, mockUnitOfWork)
    })


    describe('User account validation (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if user account does not exist in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '497dcba3-ecbf-4587-a2dd-5eb0665e6880', newEmail: 'some@email.com', currentPassword: 'Moises123' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockPasswordHasher.compare).not.toHaveBeenCalled()
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })
    })

    describe('Password validation equality (PHASE 2)', () => {

        it('should throw an AuthDomain invalid credentials error if password received does not match current password on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(false)

            const input = { actorId: user.publicId.value, newEmail: 'some@email.com', currentPassword: 'Moises123' }

            await expect(sut.execute(input)).rejects.toThrow(AuthErrorFactory.invalidCredentials().message)
            expect(mockPasswordHasher.compare).toHaveBeenCalledWith(input.currentPassword, user.password.value)
            expect(mockUserRepository.emailExists).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })
    })

    describe('Email existence validation (PHASE 3)', () => {

        it('should throw an UserDomain email already exists if new received email value matches current email on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)
            mockUserRepository.emailExists.mockResolvedValue(true)

            const input = { actorId: user.publicId.value, newEmail: 'some@email.com', currentPassword: 'Moises123' }

            const spyOnUpdate = vi.spyOn(user, 'updateEmail')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.emailAlreadyExists().message)
            expect(spyOnUpdate).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })
    })

    describe('Tokens creation, persistence and orchestration (PHASE 4)', () => {

        it('should correctly create session, verification token, update email, persist and publish UserUpdatedEmailEvent', async () => {
            const user = UserMother.reconstituteDefault()
            const oldToken = TokenMother.createEmailVerification()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)
            mockUserRepository.emailExists.mockResolvedValue(false)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, newEmail: 'some@email.com', currentPassword: 'Moises123' }

            const spyOnUpdate = vi.spyOn(user, 'updateEmail')

            await sut.execute(input)

            expect(spyOnUpdate).toHaveBeenCalled()
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(oldToken)
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(UserEntityClass))
            expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(expect.any(VerificationTokenEntityClass))
            
            
            expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                expect.any(UserUpdatedEmailEvent)
            )

            const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserUpdatedEmailEvent
            expect(publishedEvent.aggregateId).toBe(user.publicId.value)
            expect(publishedEvent.payload.fullname).toBe(user.fullname)
            expect(publishedEvent.payload.email).toBe('some@email.com')
            expect(publishedEvent.payload.verificationToken).toEqual(expect.any(String))
        })

        it('should correctly return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)
            mockUserRepository.emailExists.mockResolvedValue(false)
            mockTokenRepository.findByUser.mockResolvedValue(null)
            mockAuthService.generateToken.mockResolvedValue('asdjasd213asdj')
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, newEmail: 'new@email.com', currentPassword: user.password.value }

            const results = await sut.execute(input)

            expect(results.user.id).toBe(user.publicId.value)
            expect(results.user.status).toBe(user.status.value)
            expect(results.user.username).toBe(user.username.value)
            expect(results.user.verifiedAt).toBeNull()
            expect(results.user.fullname).toBe(user.fullname)
            expect(results.user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.user.email).toBe('new@email.com')
            expect(results.token).toBe('asdjasd213asdj')
        })
    })

})