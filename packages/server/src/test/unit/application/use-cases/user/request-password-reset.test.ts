import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js'
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js'
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'
import { IEventBus } from 'application/ports/event-bus.port.js'
import { UserRequestedPasswordResetEvent } from 'core/events/user-events/user-requested-password-reset.event.js'

describe('RequestPasswordCase.', () => {

    let sut: RequestPasswordResetCase
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

        sut = new RequestPasswordResetCase(mockUserRepository, mockTokenRepository, mockEventBus, mockUnitOfWork )
    })


    describe('Validate user existence (PHASE 1)', () => {

        it('should silently return if email received is not registered in any user account', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null)

            const input = { email: 'some@email.com' }

            const result = await sut.execute(input)

            expect(result.success).toBe(true)
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.any(UserEmailVo))
            expect(mockUnitOfWork.run).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })

    })

    describe('Ensure requested verification token is not on cooldown time (PHASE 2)', () => {

        it('should throw a TokenDomain token cooldown limit if token request exceeds max limit', async () => {
            const user = UserMother.reconstituteDefault()
            const token = TokenMother.createPasswordResetVerification()

            vi.spyOn(token, 'ensureEmailCooldown').mockImplementation(() => {
                throw TokenErrorFactory.tokenCooldownLimit()
            })

            mockUserRepository.findByEmail.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(token)


            await expect(sut.execute({ email: user.email.value })).rejects.toThrow(TokenErrorFactory.tokenCooldownLimit().message)
            expect(mockTokenRepository.saveToken).not.toHaveBeenCalled()
            expect(mockEventBus.publish).not.toHaveBeenCalled()
        })
    })


    describe('Tokens creation and orchestration (PHASE 3)', () => {

        it('should delete previous token, persist new one and publish PasswordResetRequestedEvent', async () => {
            const user = UserMother.reconstituteDefault()
            const oldToken = TokenMother.createPasswordResetVerification()
            
            mockUserRepository.findByEmail.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)

            vi.spyOn(oldToken, 'ensureEmailCooldown').mockImplementation(() => { })

            const result = await sut.execute({ email: user.email.value })

            expect(result.success).toBe(true)
            expect(mockUnitOfWork.run).toHaveBeenCalled()
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(oldToken)
            expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(expect.any(VerificationTokenEntityClass))
            
            expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                expect.any(UserRequestedPasswordResetEvent)
            )

            const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserRequestedPasswordResetEvent
            expect(publishedEvent.aggregateId).toBe(user.publicId.value)
            expect(publishedEvent.payload.fullname).toBe(user.fullname)
            expect(publishedEvent.payload.email).toBe(user.email.value)
            expect(publishedEvent.payload.verificationToken).toEqual(expect.any(String))
        })
    })

})