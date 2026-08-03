import { FindAllProjectsCase } from 'application/use-cases/project/find-all-projects.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindAllProjectsCase', () => {

    let sut: FindAllProjectsCase
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        sut = new FindAllProjectsCase(mockProjectRepository, mockUserRepository, mockMemberRepository)
    })


    describe('User account validation and access control (PHASE 1)', () => {

        it('should throw an error immediately if actorId received violates string format constraints', async () => {
            const input = { actorId: 'non-valid-uuid-format' }

            await expect(sut.execute(input)).rejects.toThrow()
            
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not found error if user id does not match any records in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '944c49fc-b947-4e14-9b9c-8e71758392ee' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
        })

        it('should throw an UserDomain user suspended locked error if user account status is currently locked', async () => {
            const user = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: '944c49fc-b947-4e14-9b9c-8e71758392ee' }
            const spyOnSuspended = vi.spyOn(user, 'ensureCanViewPlatform')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message)
            expect(spyOnSuspended).toHaveBeenCalled()

        })

        it('should throw an UserDomain user not verified error if user account is currently pending', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: '944c49fc-b947-4e14-9b9c-8e71758392ee' }
            const spyOnSuspended = vi.spyOn(user, 'ensureCanViewPlatform')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotVerified().message)
            expect(spyOnSuspended).toHaveBeenCalled()
        })
    })

    describe('Memberships and project list DTO format flow orchestration (PHASE 2)', () => {

        it('should return an empty project list if no user memberships are present in registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockMemberRepository.findAllMembershipsByUser.mockResolvedValue([])

            const input = { actorId: user.publicId.value }

            const results = await sut.execute(input)

            expect(results.projects).toEqual([])
            expect(mockProjectRepository.findAllVisibleForUser).not.toHaveBeenCalled()
        })


        it('should throw a CommonDomain common data inconsistency if any project obtained is missing its owner public id', async () => {
            const user = UserMother.reconstituteDefault()
            const membership = MemberMother.reconstituteDefault()
            const project = ProjectMother.createDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockMemberRepository.findAllMembershipsByUser.mockResolvedValue([membership])
            mockProjectRepository.findAllVisibleForUser.mockResolvedValue([project])

            const input = { actorId: user.publicId.value }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should return expected DTO format with the project array list', async () => {
            const user = UserMother.reconstituteDefault()
            const membership = MemberMother.reconstituteDefault()
            const membershipTwo = MemberMother.reconstituteOnLeave()
            const project = ProjectMother.reconstituteDefault()
            const projectTwo = ProjectMother.reconstituteInProgress()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockMemberRepository.findAllMembershipsByUser.mockResolvedValue([membership, membershipTwo])
            mockProjectRepository.findAllVisibleForUser.mockResolvedValue([project, projectTwo])

            const input = { actorId: user.publicId.value }

            const results = await sut.execute(input)

            expect(results.projects).toHaveLength(2)

            const mappedFirstProject = results.projects[0]
            expect(mappedFirstProject.id).toBe(project.publicId.value)
            expect(mappedFirstProject.title).toBe(project.title.value)
            expect(mappedFirstProject.description).toBe(project.description.value)
            expect(mappedFirstProject.ownerId).toBe(project.ownerPublicId?.value)
            expect(mappedFirstProject.status).toBe(project.status.value)
            expect(mappedFirstProject.category).toBe(project.category.value)
         
            expect(mappedFirstProject.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(mappedFirstProject.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

            expect(mockProjectRepository.findAllVisibleForUser).toHaveBeenCalledWith(
                [membership.projectId, membershipTwo.projectId],
                user.id
            )
        })
    })
    
})