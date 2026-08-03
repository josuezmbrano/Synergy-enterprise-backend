import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { VerifyEmailCase } from 'application/use-cases/user/verify-email.usecase.js'
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('VerifyEmailCase', () => {

    let sut: VerifyEmailCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()

        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new VerifyEmailCase(mockTokenRepository, mockUserRepository, mockUnitOfWork)
    })


    describe('Token validation (PHASE 1)', () => {

        it('should throw a TokenDomain token not found error if token received does not match any record in registry', async () => {
            mockTokenRepository.findByToken.mockResolvedValue(null)

            const input = { token: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenNotFound().message)
        })

        it('should throw a TokenDomain token expired error if token received is already expired', async () => {
            const tokenExpired = TokenMother.reconstituteExpired()
            mockTokenRepository.findByToken.mockResolvedValue(tokenExpired)

            const input = { token: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenExpired().message)
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a TokenDomain token invalid type if token type expected is not the same', async () => {
            const token = TokenMother.createPasswordResetVerification()

            mockTokenRepository.findByToken.mockResolvedValue(token)

            const input = { token: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenInvalidType().message)
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('User account validation (PHASE 2)', () => {

        it('should throw an UserDomain user not found error if token user does not match any record in registry', async () => {
            const token = TokenMother.reconstituteDefault()
            mockTokenRepository.findByToken.mockResolvedValue(token)

            const input = { token: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
        })
    })

    describe('Integrity and Persistence (PHASE 3)', () => {

        it('should execute save and delete within the unit of work correctly', async () => {

            const token = TokenMother.reconstituteDefault()
            const user = UserMother.createPending()

            mockTokenRepository.findByToken.mockResolvedValue(token)
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const spyOnVerify = vi.spyOn(user, 'verifyEmail')

            await sut.execute({ token: token.id.value })

            expect(spyOnVerify).toHaveBeenCalled()

            expect(mockUnitOfWork.run).toHaveBeenCalled()

            expect(mockUserRepository.save).toHaveBeenCalledWith(user)
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(token)
        })
    })

    describe('Output Delivery (PHASE 4)', () => {
        it('should return the correct DTO format upon successful verification', async () => {
            const token = TokenMother.reconstituteDefault()
            const user = UserMother.createPending()

            mockTokenRepository.findByToken.mockResolvedValue(token)
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const result = await sut.execute({ token: token.id.value })

            expect(result).toEqual({
                id: user.publicId.value,
                success: true,
                username: user.username.value
            })
        })
    })

})