import { FindUserCase } from 'application/use-cases/user/find-user.usecase.js'
import { MockProxy, mock } from 'vitest-mock-extended'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { UserMother } from 'test/builders/user.mother.js'

describe('FindUserCase', () => {

    let sut: FindUserCase
    let mockUserRepository: MockProxy<IUserRepository>

    beforeEach(() => {
        vi.clearAllMocks()
        mockUserRepository = mock<IUserRepository>()
        sut = new FindUserCase(mockUserRepository)
    })


    describe('Acting user validations (PHASE 1).', () => {

        it('should throw an UserDomain user not found error if acting user does not exist.', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)
            const input = { actorId: '6a15e985-78e7-497b-8370-d476081e7d22', query: 'test@mail.com' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.objectContaining({ _value: '6a15e985-78e7-497b-8370-d476081e7d22' }))
        })

        it('should throw an UserDomain error if user exists but lacks of permissions to view platform if its pending', async () => {
            const actingUser = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(actingUser)
            const input = { actorId: actingUser.publicId.value, query: 'any-query' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotVerified().message)
            await expect(sut.execute(input)).rejects.not.toThrow(UserErrorFactory.userSuspendedLocked().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.objectContaining({ value: actingUser.publicId.value }))
        })

        it('should throw an UserDomain error if user exists but lacks of permissions to view platform if its suspended', async () => {
            const actingUser = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(actingUser)

            const input = { actorId: actingUser.publicId.value, query: 'any-query' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message)
            await expect(sut.execute(input)).rejects.not.toThrow(UserErrorFactory.userNotVerified().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.objectContaining({ value: actingUser.publicId.value }))
        })
    })


    const setupDefaultActor = () => {
        const actor = UserMother.reconstituteDefault()
        mockUserRepository.findByPublicId.mockResolvedValue(actor)
        return actor
    }


    describe('Target user search (PHASE 2)', () => {
        beforeEach(() => setupDefaultActor())

        it('should find target user by email if an @ is present in the query search input', async () => {
            const targetUser = UserMother.reconstituteDefault()
            mockUserRepository.findByEmail.mockResolvedValue(targetUser)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'some@email.com' }
            await sut.execute(input)

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.objectContaining({ value: 'some@email.com' }))
            expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
        })

        it('should find target user by username if there is no @ in the query search input', async () => {
            const targetUser = UserMother.reconstituteDefault()
            mockUserRepository.findByUsername.mockResolvedValue(targetUser)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'bugsbunnie2104' }
            await sut.execute(input)

            expect(mockUserRepository.findByEmail).not.toHaveBeenCalled()
            expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(expect.objectContaining({ value: 'bugsbunnie2104' }))
        })

        it('should throw an UserDomain user not found error if target user does not exist.', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'some@email.com' }
            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.objectContaining({ value: 'some@email.com' }))
            expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
        })
    })

    describe('Privacy logic (Output PHASE 3)', () => {
        beforeEach(() => setupDefaultActor())

        it('should return full data output if target user is verified', async () => {

            const targetUser = UserMother.reconstituteDefault()
            mockUserRepository.findByEmail.mockResolvedValue(targetUser)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'some@email.com' }
            const result = await sut.execute(input)

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.objectContaining({ value: 'some@email.com' }))
            expect(result.id).toBe(targetUser.publicId.value)
            expect(result.email).toBe(targetUser.email.value)
            expect(result.status).toBe(targetUser.status.value)
            expect(result.username).toBe(targetUser.username.value)
            expect(result.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(result.fullname).toBe(targetUser.fullname)
        })

        it('should obscure email if target user is unverified and searched by username', async () => {

            const targetUser = UserMother.createPending()
            mockUserRepository.findByUsername.mockResolvedValue(targetUser)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'bugsbunnie2104' }
            const result = await sut.execute(input)

            expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(expect.objectContaining({ value: 'bugsbunnie2104' }))
            expect(result.status).toBe('UNVERIFIED')
            expect(result.email).toContain('•••')
        })

        it('should return full data with status unverified if target user was searched by email', async () => {

            const targetUser = UserMother.createPending()
            mockUserRepository.findByEmail.mockResolvedValue(targetUser)

            const input = { actorId: '8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5', query: 'some@gmail.com' }
            const result = await sut.execute(input)

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.objectContaining({ value: 'some@gmail.com' }))
            expect(result.status).toBe('UNVERIFIED')
            expect(result.email).toBe(targetUser.email.value)
        })
    })

    describe('Optimization & Special Scenarios (PHASE 4)', () => {

        it('should return actor data immediately if query matches their own email (Self-Search Optimization)', async () => {
            const actor = UserMother.reconstituteDefault();
            mockUserRepository.findByPublicId.mockResolvedValue(actor);

            const input = { actorId: actor.publicId.value, query: actor.email.value };
            const result = await sut.execute(input);


            expect(result.id).toBe(actor.publicId.value);
            expect(result.email).toBe(actor.email.value);

            expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
            expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
        });

        it('should return actor data immediately if query matches their own username (Self-Search Optimization)', async () => {
            const actor = UserMother.reconstituteDefault();
            mockUserRepository.findByPublicId.mockResolvedValue(actor);

            const input = { actorId: actor.publicId.value, query: actor.username.value };
            const result = await sut.execute(input);

            expect(result.username).toBe(actor.username.value);
            expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
            expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
        });
    });

})