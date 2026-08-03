import { UnarchiveProjectCase } from 'application/use-cases/project/unarchive-project.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { DateVo } from 'core/value-objects/common/date.vo.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('UnarchiveProjectCase', () => {

    let sut: UnarchiveProjectCase
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        sut = new UnarchiveProjectCase(mockProjectRepository, mockUserRepository, mockMemberRepository)
    })


    describe('User account validation and operational control (PHASE 1)', () => {

        it('should throw an error immediately if actorId or projectId received violates string format constraints', async () => {
            const input = { projectId: 'invalid-project-uuid', actorId: 'invalid-actor-uuid' }

            await expect(sut.execute(input)).rejects.toThrow()

            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not found error if user id received does not match any records in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: '1a7516d2-23c2-48a5-8a2b-2e917d23a4b0', projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not active for action error if user account status is not currently active', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }
            const spyOnOperate = vi.spyOn(user, 'ensureCanOperate')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
            expect(spyOnOperate).toHaveBeenCalled()
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence and user membership linkage validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records in registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = { actorId: user.publicId.value, projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914' }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockProjectRepository.findByPublicId).toHaveBeenCalled()
            expect(mockMemberRepository.isMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if membership linkage validation fails', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(false)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.isMember).toHaveBeenCalledWith(expect.any(ProjectIdVo), expect.any(UserIdVo))
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })
    })

    describe('Project unarchive execution, persistence and DTO return orchestration (PHASE 3)', () => {

        it('should throw a CommonDomain error if owner public id is not present on project to unarchive', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.createDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }
            const spyOnUnarchive = vi.spyOn(project, 'unarchive').mockImplementation(() => { })

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
            expect(spyOnUnarchive).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })

        it('should persist and return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: user.id, status: ProjectStatusVo.create('archived'), archivedAt: DateVo.create() })

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.save.mockResolvedValue(project)

            const input = { actorId: user.publicId.value, projectId: project.publicId.value }
            const spyOnUnarchive = vi.spyOn(project, 'unarchive')

            const results = await sut.execute(input)

            expect(spyOnUnarchive).toHaveBeenCalledWith(user.id)
            expect(mockProjectRepository.save).toHaveBeenCalledWith(project)

            expect(results.id).toBe(project.publicId.value)
            expect(results.title).toBe(project.title.value)
            expect(results.description).toBe(project.description.value)
            expect(results.ownerId).toBe(project.ownerPublicId?.value)

            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })
    })

})