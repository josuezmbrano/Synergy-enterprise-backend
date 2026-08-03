import { CreateTaskCase } from 'application/use-cases/task/create-task.usecase.js'
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js'
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js'
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js'
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js'
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('CreateTaskCase', () => {

    let sut: CreateTaskCase
    let mockTaskRepository: MockProxy<ITaskRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockTaskRepository = mock<ITaskRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        mockMemberRepository = mock<IMemberRepository>()

        sut = new CreateTaskCase(
            mockTaskRepository,
            mockUserRepository,
            mockProjectRepository,
            mockMemberRepository
        )
    })

    describe('Identities existence and resource availability (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if acting user id does not exist', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actingUserId: '550e8400-e29b-41d4-a716-446655440000',
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if project id received does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914',
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Authorization lock validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if acting user is not a member of the project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw an unauthorized domain error if the acting member is a simple CONTRIBUTOR without admin privileges', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('contributor') 
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow()
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Assignee validation and domain invariants (PHASE 3)', () => {

        it('should throw a MemberDomain member not found error if assignee public id does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('admin') 
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                assigneeMemberId: 'da39a3ee-5e6b-4b0d-9155-20e12472d176',
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })

        it('should throw a MemberDomain member not found error if assignee exists but belongs to another project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('admin') 
            })
            
            const foreignProject = ProjectMother.createDefault()
            const invalidAssignee = MemberMother.reconstituteDefault({ projectId: foreignProject.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(invalidAssignee)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                assigneeMemberId: invalidAssignee.publicId.value,
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })

        it('should throw an UserDomain user not found error if assignee account record does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('admin') 
            })
            const assigneeMember = MemberMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(assigneeMember)
            mockUserRepository.findById.mockResolvedValue(null)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Implement Auth Interceptors',
                description: 'Setup token refresh logic',
                priority: 'HIGH',
                assigneeMemberId: assigneeMember.publicId.value,
                dueDate: '2026-06-15T00:00:00.000Z'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should successfully create a task without assignee and return structural primitive DTO', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('admin') 
            })
            const task = TaskMother.createPersonalized(
                {
                    objective: TaskObjectiveVo.create('Refactor Core Aggregates'), 
                    description: TaskDescriptionVo.create('De-couple entities from infrastructure layer'),
                    priority: TaskPriorityVo.create('critical'),
                    status: TaskStatusVo.create('todo')
                }
            )

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockTaskRepository.save.mockResolvedValue(task)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Refactor Core Aggregates',
                description: 'De-couple entities from infrastructure layer',
                priority: 'CRITICAL',
                dueDate: '2026-08-20T15:00:00.000Z'
            } as const

            const result = await sut.execute(input)

            expect(mockTaskRepository.save).toHaveBeenCalledTimes(1)
            expect(result.id).toBeDefined()
            expect(result.projectId).toBe(project.publicId.value)
            expect(result.creatorId).toBe(actingMember.publicId.value)
            expect(result.assignedTo).toBeNull()
            expect(result.objective).toBe('Refactor Core Aggregates')
            expect(result.status).toBe('TODO')
        })

        it('should successfully create a task with a valid active assignee and map properties to primitives correctly', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const actingMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id, 
                role: MemberRoleVo.create('admin') 
            })
            
            const assigneeUser = UserMother.createDefault()
            const assigneeMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: assigneeUser.id })

            const task = TaskMother.createPersonalized(
                {
                    objective: TaskObjectiveVo.create('Write Clean Tests'),
                    description: TaskDescriptionVo.create('Write complete use case test coverage'),
                    priority: TaskPriorityVo.create('medium'),
                    assignedTo: assigneeMember.id
                }
            )

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(actingMember)
            mockMemberRepository.findByPublicId.mockResolvedValue(assigneeMember)
            mockUserRepository.findById.mockResolvedValue(assigneeUser)
            mockTaskRepository.save.mockResolvedValue(task)

            const input = {
                actingUserId: actor.publicId.value,
                projectId: project.publicId.value,
                objective: 'Write Clean Tests',
                description: 'Write complete use case test coverage',
                priority: 'MEDIUM',
                assigneeMemberId: assigneeMember.publicId.value,
                dueDate: '2026-07-10T12:00:00.000Z'
            } as const

            const result = await sut.execute(input)

            expect(mockTaskRepository.save).toHaveBeenCalledTimes(1)
            expect(result.projectId).toBe(project.publicId.value)
            expect(result.assignedTo).toBe(assigneeMember.publicId.value)
            expect(result.priority).toBe('MEDIUM')
            expect(result.completedAt).toBeNull()
        })
    })
    
})