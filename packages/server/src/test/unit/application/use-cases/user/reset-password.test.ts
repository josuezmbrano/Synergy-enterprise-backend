import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { ResetPasswordCase } from 'application/use-cases/user/reset-password.usecase.js'
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IPasswordHasher } from 'core/ports/password-interface.service.js'
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TokenMother } from 'test/builders/token.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('ResetPasswordCase', () => {

    let sut: ResetPasswordCase
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>

    beforeEach(() => {
        vi.clearAllMocks()

        mockTokenRepository = mock<ITokenRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()

        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new ResetPasswordCase(mockTokenRepository, mockUserRepository, mockPasswordHasher, mockUnitOfWork)
    })


    describe('Token and user account validation (PHASE 1)', () => {

        it('should throw a TokenDomain token not found error if token verification cannot be located on registry', async () => {
            mockTokenRepository.findByToken.mockResolvedValue(null)

            const input = { newPassword: 'Moises123', token: '7934256a-bc92-4b69-b240-f9e463881aea' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenNotFound().message)
            expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(expect.any(TokenIdVo))
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a TokenDomain token expired error if token received has already reached expiration date', async () => {
            const token = TokenMother.reconstituteExpired()

            mockTokenRepository.findByToken.mockResolvedValue(token)

            const input = { newPassword: 'Moises123', token: '7934256a-bc92-4b69-b240-f9e463881aea' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenExpired().message)
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a tokenDomain token invalid type error if token received is not from the type expected', async () => {
            const token = TokenMother.createEmailVerification()

            mockTokenRepository.findByToken.mockResolvedValue(token)

            const input = { newPassword: 'Moises123', token: '7934256a-bc92-4b69-b240-f9e463881aea' }

            await expect(sut.execute(input)).rejects.toThrow(TokenErrorFactory.tokenInvalidType().message)
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not found error if user from verification token does not exist', async () => {
            const token = TokenMother.createPasswordResetVerification()

            mockTokenRepository.findByToken.mockResolvedValue(token)

            const input = { newPassword: 'Moises123', token: '7934256a-bc92-4b69-b240-f9e463881aea' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled()
        })
    })

    describe('Password validation equality (PHASE 2)', () => {

        it('should throw an UserDomain user password reuse if new password matches the old one in registry', async () => {
            const token = TokenMother.createPasswordResetVerification()
            const userFromToken = UserMother.reconstituteDefault()

            mockTokenRepository.findByToken.mockResolvedValue(token)
            mockUserRepository.findByPublicId.mockResolvedValue(userFromToken)
            mockPasswordHasher.compare.mockResolvedValue(true)

            const input = { newPassword: userFromToken.password.value, token: '7934256a-bc92-4b69-b240-f9e463881aea' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userPasswordReuse().message)
            expect(mockPasswordHasher.compare).toHaveBeenCalledWith(input.newPassword, userFromToken.password.value)
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled()
        })
    })

    describe('Password creation and final orchestration (PHASE 3)', () => {

        it('should correctly hash the new password and persist changes atómicamente', async () => {

            const token = TokenMother.createPasswordResetVerification()
            const user = UserMother.reconstituteDefault()
            const newRawPassword = 'SafePassword123!'
            const expectedHash = 'hashed_password_xyz'

            mockTokenRepository.findByToken.mockResolvedValue(token)
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(false)
            mockPasswordHasher.hash.mockResolvedValue(expectedHash)

            const spyOnReset = vi.spyOn(user, 'resetPassword')

            await sut.execute({ newPassword: newRawPassword, token: token.id.value })

            expect(mockPasswordHasher.hash).toHaveBeenCalledWith(newRawPassword)

            expect(spyOnReset).toHaveBeenCalledWith(expect.objectContaining({ value: expectedHash }))

            expect(mockUnitOfWork.run).toHaveBeenCalled()
            expect(mockUserRepository.save).toHaveBeenCalledWith(user)
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith(token)
        })
    })
})