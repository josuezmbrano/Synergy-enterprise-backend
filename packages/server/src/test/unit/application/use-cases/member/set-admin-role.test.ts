import { SetAdminRoleCase } from 'application/use-cases/member/role/set-admin-role.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('SetAdminRoleCase', () => {

    let sut: SetAdminRoleCase
    let mockMemberRepository: MockProxy<IMemberRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockMemberRepository = mock<IMemberRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        sut = new SetAdminRoleCase(mockMemberRepository, mockUserRepository, mockProjectRepository)
    })

    describe('Identities existence and resource availability (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if acting user id does not exist', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '550e8400-e29b-41d4-a716-446655440000', projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914', targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not active error if acting user is suspended or pending verification', async () => {
            const actor = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)

            const input = { actorId: actor.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914', targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if project id received does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914', targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalledWith(expect.any(ProjectIdVo))
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a MemberDomain member not found error if target member does not exist in registry', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176' } as const

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
            expect(mockMemberRepository.findByPublicId).toHaveBeenCalledWith(expect.any(MemberIdVo))
        })

        it('should throw a MemberDomain member not found error if target member exists but contractually belongs to another project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const alienMember = MemberMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(alienMember)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: alienMember.publicId.value } as const

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })
    })

    describe('Authorization lock validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not owner error if acting user is not the owner of the project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault() 
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotOwner().message)
            expect(mockUserRepository.findById).not.toHaveBeenCalled() 
        })
    })

    describe('Target user validation and domain invariants (PHASE 3)', () => {

        it('should throw an UserDomain user not found error if target member account record does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(null)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
        })

        it('should throw an UserDomain user max admin roles reached error if target user already reaches 5 admin roles globally', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })
            const targetUser = UserMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockMemberRepository.countAdminRolesByUser.mockResolvedValue(5) 

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userMaxAdminRolesReached().message)
            expect(mockMemberRepository.save).not.toHaveBeenCalled()
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw a CommonDomain consistency error if the target member lacks its public user id mapping before returning output', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const corruptMember = MemberMother.createDefault({ projectId: project.id, userId: undefined, status: MemberStatusVo.create('active') })
            const targetUser = UserMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(corruptMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockMemberRepository.countAdminRolesByUser.mockResolvedValue(1)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: corruptMember.publicId.value } as const

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should successfully update target member role to admin and return primitive DTO when all verification layers pass cleanly', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id, role: MemberRoleVo.create('contributor') })
            const targetUser = UserMother.reconstituteDefault() 

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockMemberRepository.countAdminRolesByUser.mockResolvedValue(2)
            mockMemberRepository.save.mockResolvedValue(targetMember)

            const input = { actorId: actor.publicId.value, projectId: project.publicId.value, targetMemberId: targetMember.publicId.value } as const

            const result = await sut.execute(input)

            expect(mockMemberRepository.save).toHaveBeenCalledTimes(1)
            expect(result.id).toBe(targetMember.publicId.value)
            expect(result.projectId).toBe(project.publicId.value)
            expect(result.role).toBe('ADMIN')
        })
    })
})