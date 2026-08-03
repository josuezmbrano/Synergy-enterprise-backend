import { FindProjectCase } from 'application/use-cases/project/find-project.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindProjectCase', () => {

    let sut: FindProjectCase
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        sut = new FindProjectCase(mockProjectRepository, mockMemberRepository, mockUserRepository)
    })


    describe('User account validation and access control (PHASE 1)', () => {

        it('should throw an error immediately if actorId or projectId received violates string format constraints', async () => {
            const input = { projectId: 'invalid-project-uuid', actorId: 'invalid-actor-uuid' }

            await expect(sut.execute(input)).rejects.toThrow()
            
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not found error if user id does not match any records in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { projectId: '497dcba3-ecbf-4587-a2dd-5eb0665e6880', actorId: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))

            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user suspended locked error if user account status is currently locked', async () => {
            const user = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { projectId: '497dcba3-ecbf-4587-a2dd-5eb0665e6880', actorId: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not verified error if user account is currently pending', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { projectId: '497dcba3-ecbf-4587-a2dd-5eb0665e6880', actorId: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotVerified().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records in registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { projectId: '497dcba3-ecbf-4587-a2dd-5eb0665e6880', actorId: '7edb3b2e-869c-485b-af70-76a934e0fcfd' }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalledWith(expect.any(ProjectIdVo))
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('User membership validation and project (if archived) visibility check (PHASE 3)', () => {

        it('should throw a ProjectDomain project not found error if user membership is not validated against the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value}
            
            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).toHaveBeenCalledWith(expect.any(ProjectIdVo), expect.any(UserIdVo))
        })

        it('should throw a ProjectDomain project not found error if user membership is inactive and cannot access project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.createDefault({status: MemberStatusVo.create('inactive')})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value }
            const spyOnAccess = vi.spyOn(member, 'canAccessProject')

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(spyOnAccess).toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project archived locked if current status is archived and user is not the owner to access the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchivedCompleted()
            const member = MemberMother.reconstituteAdmin()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value }
            const spyOnAccess = vi.spyOn(project, 'ensureIsVisible')

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            expect(spyOnAccess).toHaveBeenCalled()
        })
    })

    describe('Project retrieve and DTO format return orchestration (PHASE 4)', () => {

        it('should throw a CommonDomain common data inconsistency if project obtained is missing its owner public id', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.createDefault()
            const member = MemberMother.reconstituteAdmin()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value }
            
            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteAdmin()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value }

            const results = await sut.execute(input)

            expect(results.id).toBe(project.publicId.value)
            expect(results.title).toBe(project.title.value)
            expect(results.description).toBe(project.description.value)
            expect(results.status).toBe(project.status.value)
            expect(results.category).toBe(project.category.value)
            expect(results.ownerId).toBe(project.ownerPublicId?.value)

            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })
    })

})