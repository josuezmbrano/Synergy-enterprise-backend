import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { ResendEmailVerificationCase } from 'application/use-cases/user/resend-email-verification.usecase.js'
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js'
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'
import { IEventBus } from 'application/ports/event-bus.port.js'
import { UserResentEmailVerificationEvent } from 'core/events/user-events/user.resent-email-verification.event.js'

describe('ResendEmailVerificationCase.', () => {

    let sut: ResendEmailVerificationCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockEventBus: MockProxy<IEventBus>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockEventBus = mock<IEventBus>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()
        

        mockUnitOfWork.run.mockImplementation(async (work) => await work())
        sut = new ResendEmailVerificationCase(mockUserRepository, mockTokenRepository, mockUnitOfWork, mockEventBus)
    })

    describe('Validate acting user and account status (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if acting user does not exist on registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user already active error if acting user is active and does not require an email resend', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userAlreadyActive().message)
            expect(mockTokenRepository.findByUser).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })
    })

    describe('Handle token orchestration, validation (PHASE 2).', () => {

        it('should ensure cooldown limit error is thrown when email resend has reached max limit within a certain time', async () => {
            const user = UserMother.create()
            const oldToken = TokenMother.createEmailVerification()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)

            vi.spyOn(oldToken, 'ensureEmailCooldown').mockImplementation(() => {
                throw TokenErrorFactory.tokenCooldownLimit()
            })

            await expect(sut.execute({ userId: user.publicId.value })).rejects.toThrow(TokenErrorFactory.tokenCooldownLimit().message)
            expect(mockTokenRepository.deleteToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.saveToken).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })

        it('should delete previous token if exists and is the same token type', async () => {
            const user = UserMother.createPending()
            const oldToken = TokenMother.createEmailVerification()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)

            const input = { userId: user.publicId.value }

            vi.spyOn(oldToken, 'ensureEmailCooldown').mockImplementation(() => { })
            await sut.execute(input)

            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(oldToken)
        })

        it('should not delete token if its not the same token type', async () => {
            const user = UserMother.createPending()
            const anotherToken = TokenMother.createPasswordResetVerification()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(anotherToken)

            const input = { userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }

            await sut.execute(input)

            expect(mockTokenRepository.deleteToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(expect.any(VerificationTokenEntityClass))
            expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserResentEmailVerificationEvent))
        })
    })

    describe('Service Resilience (PHASE 3)', () => {

        it('should execute the entire orchestration correctly and publish VerificationEmailResentEvent in a happy path', async () => {

            const user = UserMother.createPending()
            const oldToken = TokenMother.createEmailVerification()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)

            vi.spyOn(oldToken, 'ensureEmailCooldown').mockImplementation(() => { })

            const result = await sut.execute({ userId: user.publicId.value })

            expect(result.success).toBe(true)
            expect(mockUnitOfWork.run).toHaveBeenCalled()
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(oldToken)
            expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(expect.any(VerificationTokenEntityClass))

           
            expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                expect.any(UserResentEmailVerificationEvent)
            )

            
            const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserResentEmailVerificationEvent
            expect(publishedEvent.aggregateId).toBe(user.publicId.value)
            expect(publishedEvent.payload.fullname).toBe(user.fullname)
            expect(publishedEvent.payload.email).toBe(user.email.value)
            expect(publishedEvent.payload.verificationToken).toEqual(expect.any(String))
        })
    })
    
})