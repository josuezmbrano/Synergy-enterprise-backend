import { SetOnLeaveStatusCase } from 'application/use-cases/member/status/set-onleave-status.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('SetOnLeaveStatusCase', () => {

    let sut: SetOnLeaveStatusCase
    let mockMemberRepository: MockProxy<IMemberRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockTaskRepository: MockProxy<ITaskRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockMemberRepository = mock<IMemberRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        mockTaskRepository = mock<ITaskRepository>()
        
        sut = new SetOnLeaveStatusCase(
            mockMemberRepository, 
            mockUserRepository, 
            mockProjectRepository,
            mockTaskRepository
        )
    })

    describe('Identities existence and resource availability (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if acting user id does not exist', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '550e8400-e29b-41d4-a716-446655440000', projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914', targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if project id received does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914', targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a MemberDomain member not found error if target member does not exist or belongs to another project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' } 

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Authorization lock validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if acting user is not even a member of the project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
        })

        it('should throw an unauthorized error if the actor is a simple CONTRIBUTOR without admin/owner privileges', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault() 
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('contributor') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow()
            expect(mockUserRepository.findById).not.toHaveBeenCalled()
        })
    })

    describe('Business Quotas and Team Invariants (PHASE 3)', () => {

        it('should throw an UserDomain user not found error if target member account record does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id }) 
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id, role: MemberRoleVo.create('contributor') })
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('admin') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockUserRepository.findById.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockMemberRepository.countActiveContributors).not.toHaveBeenCalled()
        })

        it('should throw a domain error if target is an ADMIN and there are no backup admins to handle the project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: targetUser.id, role: MemberRoleVo.create('admin') })
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('admin') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            
            mockMemberRepository.countActiveAdmins.mockResolvedValue(1)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNoBackupAdmin().message)
        })

        it('should throw a domain error if target member is a contributor and it violates the minimum active workforce limit', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: targetUser.id, role: MemberRoleVo.create('contributor') })
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('admin') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            
            mockMemberRepository.countActiveContributors.mockResolvedValue(0)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNoBackupContributors().message)
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw a CommonDomain consistency error if the target member lacks its public user id mapping', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('admin') })
            
            const targetUser = UserMother.createDefault()
            const corruptMember = MemberMother.createDefault({ projectId: project.id, userId: undefined, status: MemberStatusVo.create('active')})

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(corruptMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.hasUserTaskPendings.mockResolvedValue(false)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: corruptMember.publicId.value }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should successfully update status to ON_LEAVE and return primitive DTO when all constraints pass seamlessly', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault() 
            const actingMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id, role: MemberRoleVo.create('admin') })
            
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id, status: MemberStatusVo.create('active'), role: MemberRoleVo.create('contributor') })
            const targetUser = UserMother.createDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.countActiveContributors.mockResolvedValue(4) 
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.hasUserTaskPendings.mockResolvedValue(false)
            mockMemberRepository.save.mockResolvedValue(targetMember) 

            const input = {
                actorId: actor.publicId.value,
                projectId: project.publicId.value,
                targetMemberId: targetMember.publicId.value
            } as const

            const result = await sut.execute(input)

            expect(mockMemberRepository.save).toHaveBeenCalledTimes(1)
            expect(result.id).toBe(targetMember.publicId.value)
            expect(result.status).toBe('ON_LEAVE')
        })
    })
})