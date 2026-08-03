import { FindAllMembersCase } from 'application/use-cases/member/find-all-members.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindAllMembersCase', () => {

    let sut: FindAllMembersCase
    let mockMemberRepository: MockProxy<IMemberRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockMemberRepository = mock<IMemberRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        sut = new FindAllMembersCase(mockMemberRepository, mockUserRepository, mockProjectRepository)
    })

    describe('User account existence and platform permissions validation (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if actor id received does not match any records', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '550e8400-e29b-41d4-a716-446655440000', projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user suspended error if user account status is currently suspended', async () => {
            const user = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not verified error if user account is pending verification', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            
            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotVerified().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence and general visibility control validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalledWith(expect.any(ProjectIdVo))
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project archived locked error if project is archived and the actor is not the owner', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchived()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Member linkage and access control validation (PHASE 3)', () => {

        it('should throw a ProjectDomain project not found error if actor is not a member of the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).toHaveBeenCalledWith(project.id, user.id)
            expect(mockMemberRepository.findAllProjectMembers).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if the actor member status cannot access the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteInactive()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }
            const spyOnCanAccess = vi.spyOn(member, 'canAccessProject')

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(spyOnCanAccess).toHaveBeenCalled()
            expect(mockMemberRepository.findAllProjectMembers).not.toHaveBeenCalled()
        })
    })

    describe('Members collection retrieval, data integrity and DTO output orchestration (PHASE 4)', () => {

        it('should query all project members including pending accounts if acting member has high privileges', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteAdmin()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findAllProjectMembers.mockResolvedValue([])

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await sut.execute(input)

            expect(mockMemberRepository.findAllProjectMembers).toHaveBeenCalledWith(project.id)
        })

        it('should throw a CommonDomain inconsistency error if a member record lacks its user public id', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteAdmin()
            const corruptMember = MemberMother.createDefault()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findAllProjectMembers.mockResolvedValue([corruptMember])

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should format all collected members into an honest primitive DTO array matching entity states', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteAdmin()
            
            const targetMember1 = MemberMother.reconstituteDefault()
            const targetMember2 = MemberMother.reconstituteAdmin()
            
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findAllProjectMembers.mockResolvedValue([targetMember1, targetMember2])

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            const results = await sut.execute(input)

            expect(results.members).toHaveLength(2)
            
            expect(results.members[0].id).toBe(targetMember1.publicId.value)
            expect(results.members[0].userId).toBe(targetMember1.userPublicId?.value)
            expect(results.members[0].projectId).toBe(project.publicId.value)
            expect(results.members[0].role).toBe(targetMember1.toPrimitives().role)

            expect(results.members[1].id).toBe(targetMember2.publicId.value)
            expect(results.members[1].userId).toBe(targetMember2.userPublicId?.value)
            expect(results.members[1].status).toBe(targetMember2.toPrimitives().status)
        })
    })
})