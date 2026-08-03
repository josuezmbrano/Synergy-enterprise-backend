import { SetDoingStatusCase } from 'application/use-cases/task/status/set-doing-status.usecase.js'
import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js'
import { MemberMother } from 'test/builders/member.mother.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('SetDoingStatusCase', () => {

    let sut: SetDoingStatusCase
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

        sut = new SetDoingStatusCase(
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            expect(mockMemberRepository.findProjectMember).not.toHaveBeenCalled()
        })
    })

    describe('Authorization lock and tactical obfuscation validation (PHASE 2)', () => {

        it('should throw a ProjectDomain project not found error (404 obfuscation) if acting user is not a member of the project', async () => {
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectNotFound().message)
            
            const spyWritable = vi.spyOn(project, 'ensureIsWritable')
            expect(spyWritable).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain archived error if project is frozen, after verifying valid membership', async () => {
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectArchivedLocked().message)
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
                targetMemberId: '85eb1a25-e5f8-4034-acbc-993d3957242c'
            }

            await expect(sut.execute(input)).rejects.toThrow(TaskErrorFactory.taskNotPermittedToEdit().message)
            expect(mockMemberRepository.findByPublicId).not.toHaveBeenCalled()
        })
    })

    describe('Business Quotas, Team Invariants and Infrastructure Shortcuts (PHASE 3)', () => {

        it('should throw a UserDomain user not found error if the target assigned member account does not exist, shortcutting the WIP limit count', async () => {
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
                targetMemberId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.userNotFound().message)
            
            expect(mockTaskRepository.countActiveTaskByUser).not.toHaveBeenCalled()
        })

        it('should throw a ProjectDomain error if target member exceeds the maximum project WIP Limit', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            const task = TaskMother.reconstituteDefault({ projectId: project.id, creatorId: member.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            
            mockTaskRepository.countActiveTaskByUser.mockResolvedValue(3) 
            vi.spyOn(project, 'ensureUserHasWipLimit').mockImplementation(() => {
                throw ProjectErrorFactory.projectWipLimitReached()
            })

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                targetMemberId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toThrow(ProjectErrorFactory.projectWipLimitReached().message)
            expect(mockTaskRepository.save).not.toHaveBeenCalled()
        })
    })

    describe('Orchestration, aggregate persistence and data integrity (PHASE 4)', () => {

        it('should throw a CommonDomain consistency error if required public id mappings are missing post-mutation', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })
            
            const corruptTask = TaskMother.reconstitutePersonalized(undefined, targetMember.publicId, {
                projectId: project.id,
                creatorId: member.id,
                assignedTo: targetMember.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(corruptTask)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.countActiveTaskByUser.mockResolvedValue(1)

            const input = {
                actorId: actor.publicId.value,
                taskId: corruptTask.publicId.value,
                targetMemberId: targetMember.publicId.value
            }

            await expect(sut.execute(input)).rejects.toBeInstanceOf(CommonDomainError)
            expect(mockTaskRepository.save).not.toHaveBeenCalled()
        })

        it('should successfully update task status to Doing and persist to repository when all guards pass', async () => {
            const actor = UserMother.reconstituteDefault()
            const project = ProjectMother.reconstituteDefault({ ownerId: actor.id })
            const member = MemberMother.reconstituteDefault({ projectId: project.id, userId: actor.id })
            
            const targetUser = UserMother.createDefault()
            const targetMember = MemberMother.createDefault({ projectId: project.id, userId: targetUser.id, status: MemberStatusVo.create('active') })
            
            const task = TaskMother.reconstitutePersonalized(member.publicId, targetMember.publicId, {
                projectId: project.id,
                creatorId: member.id,
                assignedTo: targetMember.id
            })

            mockUserRepository.findByPublicId.mockResolvedValue(actor)
            mockTaskRepository.findByPublicId.mockResolvedValue(task)
            mockProjectRepository.findById.mockResolvedValue(project)
            mockMemberRepository.findProjectMember.mockResolvedValue(member)
            mockMemberRepository.findByPublicId.mockResolvedValue(targetMember)
            mockUserRepository.findById.mockResolvedValue(targetUser)
            mockTaskRepository.countActiveTaskByUser.mockResolvedValue(1)
            mockTaskRepository.save.mockResolvedValue(task)

            const input = {
                actorId: actor.publicId.value,
                taskId: task.publicId.value,
                targetMemberId: targetMember.publicId.value
            }

            const result = await sut.execute(input)

            expect(mockTaskRepository.save).toHaveBeenCalledTimes(1)
            expect(mockTaskRepository.save).toHaveBeenCalledWith(task)
            expect(result.id).toBe(task.publicId.value)
        })
    })
    
})