import { UpdateAssigneeCase } from 'application/use-cases/task/assignee/update-assignee.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('UpdateAssigneeCase', () => {

    let sut: UpdateAssigneeCase
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

        sut = new UpdateAssigneeCase(
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
                actorId: 'd7b43a9c-ea0e-4340-bc56-e9188e99a805',
                taskId: '92891bf4-601e-450f-a36c-2f960f5bf16b',
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
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
                taskId: '92891bf4-601e-450f-a36c-2f960f5bf16b',
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
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
                taskId: task.publicId.value,
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
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
                taskId: task.publicId.value,
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockTaskRepository.save).not.toHaveBeenCalled()
        })
    })

    describe('Business Quotas and Team Invariants (PHASE 3)', () => {

        it('should throw a ProjectDomain error if the project is archived/read-only (not writable)', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteArchived()
            const task = TaskMother.reconstituteDefault({ projectId: project.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a TaskDomain error if the acting member is neither the project owner nor the task creator', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: UserIdVo.create() })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const task = TaskMother.reconstituteDefault({ 
                projectId: project.id,
                creatorId: MemberIdVo.create()
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(TaskErrorFactory.taskNotPermittedToEdit().message)

            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })

        it('should throw a MemberDomain member not found error if the target assignee member does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const task = TaskMother.reconstituteDefault({ projectId: project.id, creatorId: member.id })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(null) 

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })

        it('should throw a MemberDomain member not found error if target assignee member belongs to a different project', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const task = TaskMother.reconstituteDefault({ projectId: project.id, creatorId: member.id })
            const foreignerMember = MemberMother.reconstituteDefault({ projectId: ProjectIdVo.create() })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(foreignerMember)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: foreignerMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(MemberErrorFactory.memberNotFound().message)
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw an UserDomain user not found error if target assignee user account does not exist', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const task = TaskMother.reconstituteDefault({ projectId: project.id, creatorId: member.id })
            const targetMember = MemberMother.createDefault({ projectId: project.id, status: MemberStatusVo.create('active') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(null) 

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
        })

        it('should throw a CommonDomain consistency error if the target task lacks its public creator id mapping after assignment', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })
            
            
            const corruptTask = TaskMother.reconstitutePersonalized(undefined, targetMember.publicId, {
                projectId: project.id,
                creatorId: member.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(corruptTask)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.save.mockResolvedValue(corruptTask)

            const input = {
                actorId: actor.publicId.value,
                taskId: corruptTask.publicId.value,
                assigneeId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
            expect(mockTaskRepository.save).toHaveBeenCalled()
        })

        it('should throw a CommonDomain consistency error if the target task lacks its public assignee id mapping after assignment', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })
            
            
            const corruptTask = TaskMother.reconstitutePersonalized(member.publicId, undefined, {
                projectId: project.id,
                creatorId: member.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(corruptTask)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.save.mockResolvedValue(corruptTask)

            const input = {
                actorId: actor.publicId.value,
                taskId: corruptTask.publicId.value,
                assigneeId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
            expect(mockTaskRepository.save).toHaveBeenCalled()
        })

        it('should successfully update task assignee and return map output primitives when input is fully valid', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })
            
            const task = TaskMother.reconstitutePersonalized(member.publicId, targetMember.publicId, {
                projectId: project.id,
                creatorId: member.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.save.mockResolvedValue(task)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                assigneeId: targetMember.publicId.value
            }

            const result = await sut.execute(input)

            expect(mockTaskRepository.save).toHaveBeenCalledTimes(1)
            expect(mockTaskRepository.save).toHaveBeenCalledWith(task)
            expect(result.id).toBe(task.publicId.value)
            expect(result.assignedTo).toBe(targetMember.publicId.value)
        })
    })

})