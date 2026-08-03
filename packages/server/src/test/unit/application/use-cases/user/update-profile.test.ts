import { UpdateProfileCase } from 'application/use-cases/user/update-profile.usecase.js'
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js'
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js'
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('UpdateProfileCase', () => {

    let sut: UpdateProfileCase
    let mockUserRepository: MockProxy<IUserRepository>

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        sut = new UpdateProfileCase(mockUserRepository)
    })


    describe('User validation (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if current user does not exist on registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', username: 'Bugsbunnie2104' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
        })
    })

    describe('Corresponding update based on input received (PHASE 2)', () => {

        it('should update name if name is received', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', name: 'Josh' }

            const spyOnName = vi.spyOn(user, 'updateName')
            const spyOnLastname = vi.spyOn(user, 'updateLastname')
            const spyOnUsername = vi.spyOn(user, 'updateUsername')

            await sut.execute(input)

            expect(spyOnName).toHaveBeenCalledWith(expect.any(UserNameVo))
            expect(spyOnLastname).not.toHaveBeenCalled()
            expect(spyOnUsername).not.toHaveBeenCalled()
        })

        it('should update lastname if lastname is received', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', lastname: 'Plaza' }

            const spyOnName = vi.spyOn(user, 'updateName')
            const spyOnLastname = vi.spyOn(user, 'updateLastname')
            const spyOnUsername = vi.spyOn(user, 'updateUsername')

            await sut.execute(input)

            expect(spyOnName).not.toHaveBeenCalled()
            expect(spyOnLastname).toHaveBeenCalledWith(expect.any(UserLastnameVo))
            expect(spyOnUsername).not.toHaveBeenCalled()
        })

        it('should update username if username is received', async () => {
            const user = UserMother.reconstituteDefault({usernameUpdatedAt: null})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.usernameExists.mockResolvedValue(false)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', username: 'Bugsbunnie2100' }

            const spyOnName = vi.spyOn(user, 'updateName')
            const spyOnLastname = vi.spyOn(user, 'updateLastname')
            const spyOnUsername = vi.spyOn(user, 'updateUsername')

            await sut.execute(input)

            expect(spyOnName).not.toHaveBeenCalled()
            expect(spyOnLastname).not.toHaveBeenCalled()
            expect(spyOnUsername).toHaveBeenCalledWith(expect.any(UserUsernameVo))
        })

        it('should throw an UserDomain username already exists if username value already exists on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.usernameExists.mockResolvedValue(true)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', username: 'Bugsbunnie2100' }

            const spyOnName = vi.spyOn(user, 'updateName')
            const spyOnLastname = vi.spyOn(user, 'updateLastname')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.usernameAlreadyExists().message)

            expect(spyOnName).not.toHaveBeenCalled()
            expect(spyOnLastname).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain username change limit error if username change has exceeded limit', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.usernameExists.mockResolvedValue(false)

            const input = { actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc', username: 'Bugsbunnie2100' }

            const spyOnName = vi.spyOn(user, 'updateName')
            const spyOnLastname = vi.spyOn(user, 'updateLastname')
            const spyOnUsername = vi.spyOn(user, 'updateUsername')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userUsernameChangeLimit().message)

            expect(spyOnName).not.toHaveBeenCalled()
            expect(spyOnLastname).not.toHaveBeenCalled()
            expect(spyOnUsername).toHaveBeenCalledWith(expect.any(UserUsernameVo))
        })
    })

    describe('Update persistence and DTO return', () => {

        it('should correctly persist in repository', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, name: 'Josh' }
            const spyOnName = vi.spyOn(user, 'updateName')

            await sut.execute(input)

            expect(spyOnName).toHaveBeenCalled()
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(UserEntityClass))
        })

        it('should skip repository save if no changes are supplied in the input payload', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: user.publicId.value }

            const result = await sut.execute(input)

            expect(mockUserRepository.save).not.toHaveBeenCalled()
            expect(result.id).toBe(user.publicId.value)
        })

        it('should return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockUserRepository.save.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, name: 'Josh', lastname: 'Plaza' }

            const results = await sut.execute(input)

            expect(results.id).toBe(user.publicId.value)
            expect(results.status).toBe(user.status.value)
            expect(results.username).toBe(user.username.value)
            expect(results.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.email).toBe(user.email.value)
            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.fullname).toBe('Josh Plaza')
        })
    })

})