import { FindTaskCase } from 'application/use-cases/task/find-task.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js'
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('FindTaskCase', () => {

    let sut: FindTaskCase
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

        sut = new FindTaskCase(
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
                taskId: 'a4fd2d9b-2b4a-4d7a-8b80-1cd11ba90099'
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            expect(mockTaskRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a TaskDomain task not found error if task id received does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(null)

            const input = {
                actorId: actor.publicId.value,
                taskId: 'a4fd2d9b-2b4a-4d7a-8b80-1cd11ba90099'
            } 

            await expect(sut.execute(input)).rejects.toThrow(TaskErrorFactory.taskNotFound().message)
            expect(mockProjectRepository.findById).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain project not found error if the internal project linked to the task does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const task = TaskMother.createDefault()

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(null)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Authorization lock validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error if acting user is not a member of the project linked to the task', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const task = TaskMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(null)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
        })
    })

    describe('Business Quotas and Team Invariants (PHASE 3)', () => {

        it('should throw a ProjectDomain error if the task belongs to an archived/invisible project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchived()
            const task = TaskMother.reconstituteDefault({ projectId: project.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain error if the member trying to view the task has their project access capabilities revoked', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const task = TaskMother.reconstituteDefault({ projectId: project.id })
            const suspendedMember = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })

            vi.spyOn(suspendedMember, 'canAccessProject').mockReturnValue(false)

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(suspendedMember)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw a CommonDomain consistency error if the fetched task lacks its public creator id mapping', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const corruptTask = TaskMother.reconstitutePersonalized(undefined, undefined, { 
                projectId: project.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(corruptTask)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = {
                actorId: actor.publicId.value,
                taskId: corruptTask.publicId.value
            }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
        })

        it('should successfully return the mapped primitive task DTO when all constraints pass seamlessly', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault()
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const creatorMember = MemberMother.createDefault({ projectId: project.id })
            const assigneeMember = MemberMother.createDefault({ projectId: project.id })

            const task = TaskMother.reconstitutePersonalized(creatorMember.publicId, assigneeMember.publicId, {
                projectId: project.id,
                objective: TaskObjectiveVo.create('Optimize Prisma Client Singleton'),
                status: TaskStatusVo.create('TODO')
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value
            }

            const result = await sut.execute(input)

            expect(result.id).toBe(task.publicId.value)
            expect(result.projectId).toBe(project.publicId.value)
            expect(result.creatorId).toBe(creatorMember.publicId.value)
            expect(result.assignedTo).toBe(assigneeMember.publicId.value)
            expect(result.objective).toBe('Optimize Prisma Client Singleton')
            expect(result.status).toBe('TODO')
        })
    })
})