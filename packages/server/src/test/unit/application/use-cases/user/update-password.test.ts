import { UpdatePasswordCase } from 'application/use-cases/user/update-password.usecase.js'
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js'
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IPasswordHasher } from 'core/ports/password-interface.service.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('UpdatePasswordCase', () => {

    let sut: UpdatePasswordCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        sut = new UpdatePasswordCase(mockUserRepository, mockPasswordHasher)
    })


    describe('Validate user existence (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if user does not exists in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', newPassword: 'Moises123', oldPassword: 'Moises1234'}

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockPasswordHasher.compare).not.toHaveBeenCalled()
        })
    })

    describe('Validate password equality (PHASE 2)', () => {

        it('should throw an AuthDomain invalid credentials error if password received does not match current password on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(false)

            const input = { actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', newPassword: 'Moises123', oldPassword: 'Moises1234'}

            await expect(sut.execute(input)).rejects.toThrow(AuthErrorFactory.invalidCredentials().message)
            expect(mockPasswordHasher.compare).toHaveBeenCalledWith(input.oldPassword, user.password.value)
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user password reuse if new password value matches current password on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)

            const input = { actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', newPassword: user.password.value, oldPassword: user.password.value}

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userPasswordReuse().message)
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled()
        })
    })

    describe('Update, persistence and output return (PHASE 3)', () => {

        it('should correctly hash new password, update and persist', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)
            mockUserRepository.save.mockResolvedValue(user)
            
            const input = { actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', newPassword: 'Moises123', oldPassword: 'Moises1234'}

            const spyOnUpdate = vi.spyOn(user, 'updatePassword')

            await sut.execute(input)

            expect(spyOnUpdate).toHaveBeenCalled()
            expect(mockPasswordHasher.hash).toHaveBeenCalledWith(input.newPassword)
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(UserEntityClass))
        })

        it('should return expected DTO output', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(true)
            mockUserRepository.save.mockResolvedValue(user)
            
            const input = { actorId: user.publicId.value, newPassword: 'BrandNewPassword123!', oldPassword: 'ValidOldPassword123!' }

            const results = await sut.execute(input)

            expect(results.id).toBe(user.publicId.value)
            expect(results.fullname).toBe(user.fullname)
            expect(results.email).toBe(user.email.value)
            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.status).toBe(user.status.value)
            expect(results.username).toBe(user.username.value)
            expect(results.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })
    })

})