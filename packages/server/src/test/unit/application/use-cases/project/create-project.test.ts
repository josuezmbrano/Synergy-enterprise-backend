import { CreateProjectInput } from '@project/common/schemas/project.schema.js'
import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { CreateProjectCase } from 'application/use-cases/project/create-project.usecase.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('CreateProjectCase', () => {

    let sut: CreateProjectCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>

    beforeEach(() => {
        vi.clearAllMocks()

        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        mockMemberRepository = mock<IMemberRepository>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()
        sut = new CreateProjectCase(mockProjectRepository, mockMemberRepository, mockUserRepository, mockUnitOfWork)
    })


    describe('User validation and operational permits (PHASE 1)', () => {

        it('should throw an error immediately if input data violates Value Object constraints without querying database', async () => {
            const input: CreateProjectInput = {
                title: '',
                description: 'Valid description',
                category: 'DEVELOPMENT/ENGINEERING',
                actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc'
            };

            await expect(sut.execute(input)).rejects.toThrow();
            
            expect(mockUserRepository.findByPublicId).not.toHaveBeenCalled();
        });

        it('should throw an UserDomain user not found error if user id received does not match any records on registry', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)
            
            const input = {title: 'Some title', description: 'some description', category: 'DEVELOPMENT/ENGINEERING', actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc'} as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockUserRepository.findByPublicId).toHaveBeenCalledWith(expect.any(UserIdVo))
        })

        it('should throw an UserDomain user not active for action if user found does not meet status compliance for operational permits', async () => {
            const user = UserMother.createPending()
            mockUserRepository.findByPublicId.mockResolvedValue(user)

            const input = {title: 'Some title', description: 'some description', category: 'DEVELOPMENT/ENGINEERING', actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc'} as const
            const spyOnOperate = vi.spyOn(user, 'ensureCanOperate')

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
            expect(spyOnOperate).toHaveBeenCalled()
            expect(mockProjectRepository.exists).not.toHaveBeenCalled();
        })
    })

    describe('Project title existence validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project already exists if title received matches one record on registry', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.exists.mockResolvedValue(true)

            const input = {title: 'Some title', description: 'some description', category: 'DEVELOPMENT/ENGINEERING', actorId: '67e32b59-3348-4dc3-9645-75c60b6f50cc'} as const
            
            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectAlreadyExists().message)
            expect(mockProjectRepository.exists).toHaveBeenCalledWith(expect.any(UserIdVo), expect.any(ProjectTitleVo))
            expect(mockUnitOfWork.run).not.toHaveBeenCalled()
        })
    })

    describe('Project creation, persistence and unit of work orchestration (PHASE 3)', () => {

        it('should persist project, member and return expected DTO format within unit of work correctly', async () => {
            const user = UserMother.reconstituteDefault()
            const project = ProjectMother.createDefault()
            const member = MemberMother.createDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(user)
            mockProjectRepository.exists.mockResolvedValue(false)
            mockProjectRepository.save.mockResolvedValue(project)
            mockMemberRepository.save.mockResolvedValue(member)

            mockUnitOfWork.run.mockImplementation(async (fn) => await fn())

            const input: CreateProjectInput = {title: project.title.value, description: project.description.value, category: 'DEVELOPMENT/ENGINEERING', actorId: user.publicId.value}

            const results = await sut.execute(input)

            expect(results.id).toBeDefined()
            expect(typeof results.id).toBe('string');
            expect(results.title).toBe(project.title.value)
            expect(results.description).toBe(project.description.value)
            expect(results.category).toBe(project.category.value)
            expect(results.status).toBe(project.status.value)
            expect(results.ownerId).toBe(user.publicId.value)
            expect(results.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            expect(results.completedAt).toBeNull()
            expect(results.archivedAt).toBeNull()


            expect(mockUnitOfWork.run).toHaveBeenCalled();
            expect(mockProjectRepository.save).toHaveBeenCalled();
            expect(mockMemberRepository.save).toHaveBeenCalled();
        })
    })
})