import { FindMemberCase } from 'application/use-cases/member/find-member.usecase.js'
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
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindMemberCase', () => {

    let sut: FindMemberCase
    let mockMemberRepository: MockProxy<IMemberRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockMemberRepository = mock<IMemberRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        sut = new FindMemberCase(mockMemberRepository, mockUserRepository, mockProjectRepository)
    })

    describe('User account existence and platform permissions validation (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if actor id received does not match any records', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: '550e8400-e29b-41d4-a716-446655440000',
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user suspended error if user account status is currently suspended', async () => {
            const user = UserMother.createSuspended()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = {
                actorId: user.publicId.value,
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not verified error if user account is pending verification', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = {
                actorId: user.publicId.value,
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotVerified().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence and general visibility control validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: user.publicId.value,
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalledWith(expect.any(ProjectIdVo))
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project archived locked error if project is archived and the actor is not the owner', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchived() //

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Acting member linkage and access control validation (PHASE 3)', () => {

        it('should throw a ProjectDomain project not found error if actor is not a member of the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).toHaveBeenCalledWith(project.id, user.id)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if the actor member status cannot access the project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteInactive()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Target member retrieval, contextual visibility and DTO orchestration (PHASE 4)', () => {

        it('should throw a MemberDomain member not found error if target member id does not exist in registry', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ userId: user.id, projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176'
            }

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
            expect(mockMemberRepository.findByPublicId).toHaveBeenCalledWith(expect.any(MemberIdVo))
        })

        it('should throw a MemberDomain member not found error if target member exists but belongs contractually to another project', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ userId: user.id, projectId: project.id })
            const alienMember = MemberMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(alienMember)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: alienMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })

        it('should throw a CommonDomain inconsistency error if retrieved target member record lacks its user public id', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ userId: user.id, projectId: project.id })
            const corruptMember = MemberMother.createDefault({ projectId: project.id, userId: undefined, status: MemberStatusVo.create('active') }) 

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(corruptMember)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: corruptMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should successfully return a mapped member primitive DTO when all validation layers pass cleanly', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ userId: user.id, projectId: project.id })
            const targetMember = MemberMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)

            const input = {
                actorId: user.publicId.value,
                projectId: project.publicId.value,
                memberId: targetMember.publicId.value
            }

            const result = await sut.execute(input)

            expect(result.id).toBe(targetMember.publicId.value)
            expect(result.projectId).toBe(project.publicId.value)
            expect(result.userId).toBe(targetMember.userPublicId?.value)
            expect(result.role).toBe(targetMember.toPrimitives().role)
            expect(result.status).toBe(targetMember.toPrimitives().status)
        })
    })
    
})