import { LoggerPort } from 'application/ports/logger.port.js'
import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js'
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js'
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IMailService } from 'application/ports/mail-interface.service.js'
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('RequestPasswordCase.', () => {

    let sut: RequestPasswordResetCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockMailService: MockProxy<IMailService>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>
    let mockLogger: MockProxy<LoggerPort>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockMailService = mock<IMailService>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()
        mockLogger = mock<LoggerPort>()

        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new RequestPasswordResetCase(mockUserRepository, mockTokenRepository, mockMailService, mockUnitOfWork, mockLogger)
    })


    describe('Validate user existence (PHASE 1)', () => {

        it('should silently return if email received is not registered in any user account', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null)

            const input = { email: 'some@email.com' }

            const result = await sut.execute(input)

            expect(result.success).toBe(true)
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.any(UserEmailVo))
            expect(mockUnitOfWork.run).not.toHaveBeenCalled()
            expect(mockMailService.sendEmail).not.toHaveBeenCalled()
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
            expect(mockMailService.sendEmail).not.toHaveBeenCalled()
        })
    })


    describe('Tokens creation and orchestration (PHASE 3)', () => {

        it('should delete previous token, persist new one and send email', async () => {
            const user = UserMother.reconstituteDefault()
            const oldToken = TokenMother.createPasswordResetVerification()
            mockUserRepository.findByEmail.mockResolvedValue(user)
            mockTokenRepository.findByUser.mockResolvedValue(oldToken)

            vi.spyOn(oldToken, 'ensureEmailCooldown').mockImplementation(() => { })

            await sut.execute({ email: user.email.value })

            expect(mockUnitOfWork.run).toHaveBeenCalled()
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(oldToken)
            expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(expect.any(VerificationTokenEntityClass))
            expect(mockMailService.sendEmail).toHaveBeenCalled()
        })

        it('should return success, log warning and complete execution even if mail service fails', async () => {
            const user = UserMother.reconstituteDefault()
            const mailError = new Error('SMTP Down')

            mockUserRepository.findByEmail.mockResolvedValue(user)
            mockMailService.sendEmail.mockRejectedValue(mailError)

            const result = await sut.execute({ email: user.email.value })

            expect(result.success).toBe(true)
            expect(mockTokenRepository.saveToken).toHaveBeenCalled()

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.any(String),
                mailError,
                {
                    email: user.email.value,
                    userId: user.publicId.value
                }
            )
        })
    })

})