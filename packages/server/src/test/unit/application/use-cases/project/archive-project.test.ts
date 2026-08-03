import { ArchiveProjectCase } from 'application/use-cases/project/status-usecases/archive-project.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('ArchiveProjectCase', () => {

    let sut: ArchiveProjectCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        sut = new ArchiveProjectCase(mockProjectRepository, mockUserRepository, mockMemberRepository)
    })


    describe('User account existence and operational permissions validation (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if user id received does not match any records in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '550e8400-e29b-41d4-a716-446655440000', projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not active for action if user account status is not currently active', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence and membership linkage validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records in registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalledWith(expect.any(ProjectIdVo))
            expect(mockMemberRepository.isMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if membership validation fails', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(false)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }
            const spyOnArchive = vi.spyOn(project, 'moveToArchived')

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.isMember).toHaveBeenCalledWith(expect.any(ProjectIdVo), expect.any(UserIdVo))
            expect(spyOnArchive).not.toHaveBeenCalled()
        })
    })

    describe('Status update persistence and DTO return orchestration (PHASE 3)', () => {

        it('should throw a CommonDomain error if owner public id is not present on updated project records', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.createWithPersonalizedProps({ ownerId: user.id })
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })

        it('should update, persist changes and return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: user.id }) 
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.save.mockResolvedValue(project)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }
            const spyOnArchive = vi.spyOn(project, 'moveToArchived')

            const results = await sut.execute(input)

            // Aserciones limpias y desacopladas
            expect(spyOnArchive).toHaveBeenCalledWith(user.id)
            expect(mockProjectRepository.save).toHaveBeenCalledWith(project)
            
            expect(results.ownerId).toBe(project.ownerPublicId?.value)
            expect(results.id).toBe(project.publicId.value)
            expect(results.status).toBe(project.toPrimitives().status) 
            expect(results.archivedAt).not.toBeNull()
        })
    })

})