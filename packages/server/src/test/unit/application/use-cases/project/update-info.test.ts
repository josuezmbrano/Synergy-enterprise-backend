import { UpdateProjectInfoCase } from 'application/use-cases/project/update-project-info.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('UpdateProjectInfoCase', () => {

    let sut: UpdateProjectInfoCase
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        sut = new UpdateProjectInfoCase(mockProjectRepository, mockUserRepository, mockMemberRepository)
    })


    describe('User account existence validation and operational control (PHASE 1)', () => {

        it('should throw an error immediately if format constraints are violated in structural value objects', async () => {
            const input = { projectId: 'invalid-uuid', actorId: 'invalid-uuid', title: 'a' }

            await expect(sut.execute(input)).rejects.toThrow()
            
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled()
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not found error if user id received does not match any records in registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = {projectId: '9e34c264-9a84-4861-9f2d-8b63a948483d', actorId: '0c7e2b8f-1a5a-4e8c-8f9d-123456789abc', title: 'some new title'}

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an UserDomain user not active for action error if user account status is not currently active for operational actions', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = {projectId: '9e34c264-9a84-4861-9f2d-8b63a948483d', actorId: user.publicId.value, title: 'some new title'}
            const spyOnOperate = vi.spyOn(user, 'ensureCanOperate')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
            expect(spyOnOperate).toHaveBeenCalled()
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Project existence and membership linkage validation control (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if project id received does not match any records in registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = {projectId: '9e34c264-9a84-4861-9f2d-8b63a948483d', actorId: user.publicId.value, title: 'some new title'}

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

            const input = {projectId: project.publicId.value, actorId: user.publicId.value, title: 'some new title'}

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.isMember).toHaveBeenCalledWith(expect.any(ProjectIdVo), expect.any(UserIdVo))
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })
    })

    describe('Info update orchestration process (PHASE 3)', () => {

        it('should throw a ProjectDomain project already exists if new title updated matches another project title in registry', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ownerId: user.id})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.exists.mockResolvedValue(true)

            const input = {projectId: project.publicId.value, actorId: user.publicId.value, title: 'some new title'}
            const spyOnTitle = vi.spyOn(project, 'updateTitle')

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectAlreadyExists().message)
            expect(mockProjectRepository.exists).toHaveBeenCalledWith(expect.any(UserIdVo), expect.any(ProjectTitleVo))
            expect(spyOnTitle).not.toHaveBeenCalled()
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })

        it('should apply a fast return bypass without invoking database persistence if updates fields are empty or missing', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: user.id })
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value }

            const results = await sut.execute(input)

            expect(results.id).toBe(project.publicId.value)
            expect(mockProjectRepository.save).not.toHaveBeenCalled()
        })

        it('should execute title update method if input received correspond to title field', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ownerId: user.id})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.exists.mockResolvedValue(false)
            mockProjectRepository.save.mockResolvedValue(project)

            const input = {projectId: project.publicId.value, actorId: user.publicId.value, title: 'some new title'}
            const spyOnDescription = vi.spyOn(project, 'updateDescription')

            const results = await sut.execute(input)

            expect(results.title).toBe('some new title')
            expect(spyOnDescription).not.toHaveBeenCalled()
            expect(mockProjectRepository.save).toHaveBeenCalledWith(project)
        })

        it('should execute description update method if input received correspond to description field', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ownerId: user.id})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.exists.mockResolvedValue(false)
            mockProjectRepository.save.mockResolvedValue(project)

            const input = {projectId: project.publicId.value, actorId: user.publicId.value, description: 'some new description'}
            const spyOnTitle = vi.spyOn(project, 'updateTitle')

            const results = await sut.execute(input)

            expect(results.description).toBe('some new description')
            expect(spyOnTitle).not.toHaveBeenCalled()
            expect(mockProjectRepository.save).toHaveBeenCalledWith(project)
        })
    })

    describe('Project update persistence, and DTO return orchestration', () => {

        it('should throw a CommomDomain error if owner public id value is not present in project records', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.createWithPersonalizedProps({ownerId: user.id})
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.exists.mockResolvedValue(false)

            const input = {projectId: project.publicId.value, actorId: user.publicId.value, description: 'some new description'}

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should persist changes and return expected DTO format', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: user.id })
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.isMember.mockResolvedValue(true)
            mockProjectRepository.exists.mockResolvedValue(false)
            mockProjectRepository.save.mockResolvedValue(project)

            const input = { projectId: project.publicId.value, actorId: user.publicId.value, description: 'some new description' }

            const results = await sut.execute(input)

            expect(results.ownerId).toBe(project.ownerPublicId?.value)
            expect(results.id).toBe(project.publicId.value)
            expect(results.description).toBe('some new description')
            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })
    })

})