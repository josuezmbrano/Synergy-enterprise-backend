import { FindAllTasksCase } from 'application/use-cases/task/find-all-tasks.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js'
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js'
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindAllTasksCase', () => {

    let sut: FindAllTasksCase
    let mockTaskRepository: MockProxy<ITaskRepository>
    let mockProjectRepository: MockProxy<IProjectRepository>
    let mockUserRepository: MockProxy<IUserRepository>
    let mockMemberRepository: MockProxy<IMemberRepository>

    beforeEach(() => {
        vi.clearAllMocks()

        mockTaskRepository = mock<ITaskRepository>()
        mockProjectRepository = mock<IProjectRepository>()
        mockUserRepository = mock<IUserRepository>()
        mockMemberRepository = mock<IMemberRepository>()

        sut = new FindAllTasksCase(
            mockTaskRepository,
            mockProjectRepository,
            mockUserRepository,
            mockMemberRepository
        )
    })

    describe('Identities existence and resource availability (PHASE 1)', () => {

        it('should throw an UserDomain user not found error if acting user id does not exist', async () => {
            mockUserRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: '550e8400-e29b-41d4-a716-446655440000',
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914'
            } as const

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockProjectRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if project id received does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: actor.publicId.value,
                projectId: 'f353ca91-4fc5-49f2-9b9e-304f83d11914'
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
                actorId: actor.publicId.value,
                projectId: project.publicId.value
            } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockTaskRepository.findByProject).not.toHaveBeenCalled()
        })
    })

    describe('Business Quotas and Team Invariants (PHASE 3)', () => {
        
        it('should throw a ProjectDomain error if the project is archived/invisible for the acting user', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchived()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)

            const input = {
                actorId: actor.publicId.value,
                projectId: project.publicId.value
            } as const

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain error if the member has suspended or invalid project access capabilities', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const suspendedMember = MemberMother.reconstituteDefault({ 
                projectId: project.id, 
                userId: actor.id 
            })

            vi.spyOn(suspendedMember, 'canAccessProject').mockReturnValue(false)

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(suspendedMember)

            const input = {
                actorId: actor.publicId.value,
                projectId: project.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockTaskRepository.findByProject).not.toHaveBeenCalled()
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw a CommonDomain consistency error if any fetched task is missing its public creator id mapping', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })

            const corruptTask = TaskMother.createDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockTaskRepository.findByProject.mockResolvedValue([corruptTask])

            const input = {
                actorId: actor.publicId.value,
                projectId: project.publicId.value
            } as const

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should successfully return a collection of mapped primitive task DTOs when constraints pass seamlessly', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })

            const creatorMember = MemberMother.createDefault({ projectId: project.id })
            const assigneeMember = MemberMother.createDefault({ projectId: project.id })

            const taskOne = TaskMother.reconstitutePersonalized(creatorMember.publicId,
                assigneeMember.publicId,
                {
                    projectId: project.id,
                    objective: TaskObjectiveVo.create('Setup Repository Pattern'),
                    priority: TaskPriorityVo.create('HIGH'),
                    status: TaskStatusVo.create('DOING')
                }
            )

            const taskTwo = TaskMother.reconstitutePersonalized(creatorMember.publicId, undefined, {
                projectId: project.id,
                objective: TaskObjectiveVo.create('Fix Memory Leaks'),
                priority: TaskPriorityVo.create('CRITICAL'),
                status: TaskStatusVo.create('TODO')
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockProjectRepository.findByPublicId.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockTaskRepository.findByProject.mockResolvedValue([taskOne, taskTwo])

            const input = {
                actorId: actor.publicId.value,
                projectId: project.publicId.value
            } as const

            const result = await sut.execute(input)

            expect(mockTaskRepository.findByProject).toHaveBeenCalledTimes(1)
            expect(result.tasks).toHaveLength(2)

            expect(result.tasks[0].projectId).toBe(project.publicId.value)
            expect(result.tasks[0].creatorId).toBe(creatorMember.publicId.value)
            expect(result.tasks[0].assignedTo).toBe(assigneeMember.publicId.value)
            expect(result.tasks[0].objective).toBe('Setup Repository Pattern')
            expect(result.tasks[0].status).toBe('DOING')

            expect(result.tasks[1].assignedTo).toBeNull()
            expect(result.tasks[1].priority).toBe('CRITICAL')
            expect(result.tasks[1].status).toBe('TODO')
        })
    })

    
})