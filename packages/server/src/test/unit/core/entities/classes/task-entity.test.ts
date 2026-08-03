import { TaskDomainError } from 'core/errors/domain/domain-classes.error.js'
import { DateVo } from 'core/value-objects/common/date.vo.js'
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js'
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js'
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js'
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js'
import { TaskMother } from 'test/builders/task.mother.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('TaskEntityClass creation, methods testing and core logic.', () => {

    describe('Creation, reconstitution testing.', () => {

        it('must create a valid TaskEntity instance correctly.', () => {

            const taskEntity = TaskMother.createDefault()

            expect(taskEntity.objective.value).toBe('Task objective example')
            expect(taskEntity.status.value).toBe('TODO')
        })

        it('must reconstitute a valid TaskEntity instance correctly.', () => {

            const taskEntity = TaskMother.reconstituteDefault()

            expect(taskEntity.status.value).toBe('TODO')
            expect(taskEntity.objective.value).toBe('Reconstituted task objective example')
            expect(taskEntity.creatorPublicId?.value).toBe('2b4e78a6-5626-4d2c-813f-366a4f911993')
        })
    })

    describe('Update entity core logic', () => {

        beforeEach(() => {
            vi.useFakeTimers();
            const mockDate = new Date(2026, 4, 20, 10, 0, 0);
            vi.setSystemTime(mockDate);
        });

        afterEach(() => {
            vi.useRealTimers();
        });


        describe('Update objective', () => {

            it('should update the objective and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.updateObjective(TaskObjectiveVo.create('New objective example'))
                expect(taskEntity.objective.value).toBe('New objective example')
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const newObjective = TaskObjectiveVo.create('New objective')
                expectDomainError(TaskDomainError, () => taskEntity.updateObjective(newObjective), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a REVIEW_STATUS_LOCKED reason if current task status is review', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const newObjective = TaskObjectiveVo.create('New objective')
                expectDomainError(TaskDomainError, () => taskEntity.updateObjective(newObjective), 3, undefined, 'REVIEW_STATUS_LOCKED')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const newObjective = TaskObjectiveVo.create('New objective')
                expectDomainError(TaskDomainError, () => taskEntity.updateObjective(newObjective), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should not perform any updates if new value is the same as the old value', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const newObjective = TaskObjectiveVo.create('Reconstituted task objective example')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.updateObjective(newObjective)

                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
            })
        })

        describe('Update description', () => {

            it('should update the description and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.updateDescription(TaskDescriptionVo.create('New reconstituted task description example'))
                expect(taskEntity.description.value).toBe('New reconstituted task description example')
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const newDescription = TaskDescriptionVo.create('New description')
                expectDomainError(TaskDomainError, () => taskEntity.updateDescription(newDescription), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a REVIEW_STATUS_LOCKED reason if current task status is review', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const newDescription = TaskDescriptionVo.create('New description')
                expectDomainError(TaskDomainError, () => taskEntity.updateDescription(newDescription), 3, undefined, 'REVIEW_STATUS_LOCKED')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const newDescription = TaskDescriptionVo.create('New description')
                expectDomainError(TaskDomainError, () => taskEntity.updateDescription(newDescription), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should not perform any updates if new value is the same as the old value', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const newDescription = TaskDescriptionVo.create('Reconstituted task description example')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.updateDescription(newDescription)
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
            })
        })

        describe('Update status to DOING', () => {

            it('should update to doing, mark updatedAt timestamp field and ensure completedAt remains null', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToDoing(MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'))
                expect(taskEntity.status.isDoing()).toBe(true)
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(taskEntity.completedAtDate).toBeNull()
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToDoing(assignedMember), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToDoing(assignedMember), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a MISSING_TASK_ASSIGNEE reason if current task does not have an assigned member when changing status', () => {

                const taskEntity = TaskMother.createDefault()
                const memberAssigned = MemberIdVo.create()
                expectDomainError(TaskDomainError, () => taskEntity.moveToDoing(memberAssigned), 3, undefined, 'MISSING_TASK_ASSIGNEE')
            })

            it('should throw a MEMBER_ASSIGNED_MISMATCH reason if member assigned does not match current', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const incorrectAssigned = MemberIdVo.create()
                expectDomainError(TaskDomainError, () => taskEntity.moveToDoing(incorrectAssigned), 3, undefined, 'MEMBER_ASSIGNED_MISMATCH')
            })

            it('should not perform any updates if current status is already in DOING', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('doing') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToDoing(assignedMember)
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
                expect(taskEntity.completedAtDate).toBeNull()
            })

            it('should throw a STATUS_FLOW_VIOLATION if status transition does not follow a valid path (status must be todo)', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToDoing(assignedMember), 3, undefined, 'STATUS_FLOW_VIOLATION')
            })
        })

        describe('Update to REVIEW', () => {

            it('should update to review, mark updatedAt timestamp field and ensure completedAt remains null', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('doing') })
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToReview(MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'))
                expect(taskEntity.status.isReview()).toBe(true)
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(taskEntity.completedAtDate).toBeNull()
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToReview(assignedMember), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToReview(assignedMember), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a MISSING_TASK_ASSIGNEE reason if current task does not have an assigned member when changing status', () => {

                const taskEntity = TaskMother.createDefault()
                const memberAssigned = MemberIdVo.create()
                expectDomainError(TaskDomainError, () => taskEntity.moveToReview(memberAssigned), 3, undefined, 'MISSING_TASK_ASSIGNEE')
            })

            it('should throw a MEMBER_ASSIGNED_MISMATCH reason if member assigned does not match current', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('doing') })
                const incorrectMember = MemberIdVo.create()
                expectDomainError(TaskDomainError, () => taskEntity.moveToReview(incorrectMember), 3, undefined, 'MEMBER_ASSIGNED_MISMATCH')
            })

            it('should throw a STATUS_FLOW_VIOLATION if status transition does not follow a valid path (status must be doing)', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('todo') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToReview(assignedMember), 3, undefined, 'STATUS_FLOW_VIOLATION')
            })

            it('should not perform any updates if current status is already in REVIEW', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToReview(assignedMember)
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
                expect(taskEntity.completedAtDate).toBeNull()

            })
        })

        describe('Update to COMPLETED', () => {

            it('should update to completed status, mark updatedAt and completedAt timestamp fields', () => {


                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToCompleted(MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'))
                expect(taskEntity.status.isCompleted()).toBe(true)
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(taskEntity.completedAtDate).not.toBeNull()
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToCompleted(assignedMember), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a MISSING_TASK_ASSIGNEE reason if current task does not have an assigned member when changing status', () => {

                const taskEntity = TaskMother.createDefault()
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToCompleted(assignedMember), 3, undefined, 'MISSING_TASK_ASSIGNEE')
            })

            it('should throw a MEMBER_ASSIGNED_MISMATCH reason if member assigned does not match current', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const assignedMember = MemberIdVo.create()
                expectDomainError(TaskDomainError, () => taskEntity.moveToCompleted(assignedMember), 3, undefined, 'MEMBER_ASSIGNED_MISMATCH')
            })

            it('should throw a STATUS_FLOW_VIOLATION if status transition does not follow a valid path (status must be review)', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('todo') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.moveToCompleted(assignedMember), 3, undefined, 'STATUS_FLOW_VIOLATION')
            })

            it('should not perform any updates if current status is already in COMPLETED', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const assignedMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToCompleted(assignedMember)
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
            })

        })

        describe('Update priority to LOW, MEDIUM, HIGH, CRITICAL', () => {

            it('should update to desire priority, and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.createDefault()
                const previousUpdatedAt1 = taskEntity.updatedAtDate.value.getTime()

                const taskEntity2 = TaskMother.createDefault()
                const previousUpdatedAt2 = taskEntity2.updatedAtDate.value.getTime()

                const taskEntity3 = TaskMother.createDefault()
                const previousUpdatedAt3 = taskEntity3.updatedAtDate.value.getTime()

                const taskEntity4 = TaskMother.reconstituteDefault({ priority: TaskPriorityVo.create('medium') })
                const previousUpdatedAt4 = taskEntity4.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToMedium()
                taskEntity2.moveToHigh()
                taskEntity3.moveToCritical()
                taskEntity4.moveToLow()

                expect(taskEntity.priority.isMedium()).toBe(true)
                expect(taskEntity2.priority.isHigh()).toBe(true)
                expect(taskEntity3.priority.isCritical()).toBe(true)
                expect(taskEntity4.priority.isLow()).toBe(true)

                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt1)
                expect(taskEntity2.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt2)
                expect(taskEntity3.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt3)
                expect(taskEntity4.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt4)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                expectDomainError(TaskDomainError, () => taskEntity.moveToHigh(), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                expectDomainError(TaskDomainError, () => taskEntity.moveToHigh(), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a REVIEW_STATUS_LOCKED reason if current task status is review', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                expectDomainError(TaskDomainError, () => taskEntity.moveToHigh(), 3, undefined, 'REVIEW_STATUS_LOCKED')
            })

            it('should not perform any updates if current priority is already in the desire update value', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.moveToLow()
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
            })

        })

        describe('AssignTo member update', () => {

            it('should update assignee member, and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.createDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.assignTo(MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'))
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(taskEntity.assignedTo?.value).toBe('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const assigneToMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.assignTo(assigneToMember), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const assigneToMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c5')
                expectDomainError(TaskDomainError, () => taskEntity.assignTo(assigneToMember), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a REVIEW_STATUS_LOCKED reason if current task status is review', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const assigneToMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c5')
                expectDomainError(TaskDomainError, () => taskEntity.assignTo(assigneToMember), 3, undefined, 'REVIEW_STATUS_LOCKED')
            })

            it('should not perform any updates if current member assigned is the same as the new value', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const assigneToMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.assignTo(assigneToMember)
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAtDate)
            })
        })

        describe('Unassign member from task', () => {

            it('should unassign member from the task as null, and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                const previousUpdatedAtDate = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.unassignFrom(unassignMember)
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAtDate)
                expect(taskEntity.assignedTo).toBeNull()
            })

            it('should throw a EXPIRED_TASK_LOCKED reason if current task is overdue', () => {

                const taskEntity = TaskMother.reconstituteOverdue()
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.unassignFrom(unassignMember), 3, undefined, 'EXPIRED_TASK_LOCKED')
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.unassignFrom(unassignMember), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a REVIEW_STATUS_LOCKED reason if current task status is review', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('review') })
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.unassignFrom(unassignMember), 3, undefined, 'REVIEW_STATUS_LOCKED')
            })

            it('should throw a MEMBER_ASSIGNED_MISMATCH reason if the target assigned member does not match current task assigned member', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c5')
                expectDomainError(TaskDomainError, () => taskEntity.unassignFrom(unassignMember), 3, undefined, 'MEMBER_ASSIGNED_MISMATCH')
            })

            it('should throw a CANNOT_UNASSIGN_ACTIVE_TASK if unassign action is performed on an active task', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('doing') })
                const unassignMember = MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2')
                expectDomainError(TaskDomainError, () => taskEntity.unassignFrom(unassignMember), 3, undefined, 'CANNOT_UNASSIGN_ACTIVE_TASK')
            })
        })

        describe('Extend duedate ', () => {

            it('should update duedate, and mark updatedAt timestamp field value', () => {

                const taskEntity = TaskMother.createDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                const newDate = new Date()
                newDate.setHours(newDate.getHours() + 96)
                const newDuedate = DateVo.create(newDate)

                vi.advanceTimersByTime(10000)

                taskEntity.extendDueDate(newDuedate)

                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(taskEntity.duedate).toEqual(newDuedate)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if current task status is completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })
                const newDate = new Date()
                newDate.setHours(newDate.getHours() + 96)
                const newDuedate = DateVo.create(newDate)

                expectDomainError(TaskDomainError, () => taskEntity.extendDueDate(newDuedate), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw a INVALID_DUE_DATE if new duedate value is before createdAt value', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const newDate = new Date()
                newDate.setHours(newDate.getHours() - 96)
                const newDuedate = DateVo.create(newDate)

                expectDomainError(TaskDomainError, () => taskEntity.extendDueDate(newDuedate), 3, undefined, 'INVALID_DUE_DATE')
            })

            it('should throw a INVALID_DUE_DATE if new duedate value is before current time value', () => {

                const task = TaskMother.createDefault();

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayVo = DateVo.create(yesterday);

                expectDomainError(TaskDomainError, () => task.extendDueDate(yesterdayVo), 3, undefined, 'INVALID_DUE_DATE')
            })

            it('should not perform any updates if new duedate value is the same as the current value', () => {

                const taskEntity = TaskMother.reconstituteDefault()

                const futureDate = new Date()
                futureDate.setHours(futureDate.getHours() + 48)

                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.extendDueDate(DateVo.create(futureDate))
                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(taskEntity.duedate.value.getTime()).toEqual(futureDate.getTime())
            })
        })

        describe('Authomatic overdue mark', () => {

            it('should update status to overdue and priority to critical, and mark updatedAt timestamp field', () => {

                const taskEntity = TaskMother.reconstituteDefault()
                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(172900000)

                taskEntity.markAsOverdue()
                expect(taskEntity.status.isOverDue()).toBe(true)
                console.log(taskEntity.status.value)
                expect(taskEntity.priority.isCritical()).toBe(true)
                expect(taskEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should not perform any updates if current task status is already in overdue or completed', () => {

                const taskEntity = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('overdue') })
                const taskEntity2 = TaskMother.reconstituteDefault({ status: TaskStatusVo.create('completed') })

                const previousUpdatedAt = taskEntity.updatedAtDate.value.getTime()
                const previousUpdatedAt2 = taskEntity2.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                taskEntity.markAsOverdue()
                taskEntity2.markAsOverdue()

                expect(taskEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
                expect(taskEntity2.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt2)
            })
        })

    })

    describe('Data integrity verification', () => {

        it('should return a primitive object with all values correctly synced to VO', () => {

            const taskEntity = TaskMother.reconstituteDefault()
            const taskPrimitives = taskEntity.toPrimitives()

            expect(taskEntity.id.value).toEqual(taskPrimitives.id)
            expect(taskEntity.publicId.value).toEqual(taskPrimitives.publicId)
            expect(taskEntity.objective.value).toEqual(taskPrimitives.objective)
            expect(taskEntity.description.value).toEqual(taskPrimitives.description)
            expect(taskEntity.status.value).toEqual(taskPrimitives.status)
            expect(taskEntity.priority.value).toEqual(taskPrimitives.priority)
            expect(taskEntity.assignedTo?.value).toEqual(taskPrimitives.assignedTo)
            expect(taskEntity.assignedToPublicId?.value).toEqual(taskPrimitives.assignedToPublicId)
            expect(taskEntity.creatorId.value).toEqual(taskPrimitives.creatorId)
            expect(taskEntity.creatorPublicId?.value).toEqual(taskPrimitives.creatorPublicId)
            expect(taskEntity.projectId.value).toEqual(taskPrimitives.projectId)
            expect(taskEntity.createdAtDate.value.getTime()).toEqual(taskPrimitives.createdAt.getTime())
            expect(taskEntity.updatedAtDate.value.getTime()).toEqual(taskPrimitives.updatedAt.getTime())
            expect(taskEntity.completedAtDate?.value.getTime()).toEqual(taskPrimitives.completedAt?.getTime())
            expect(taskEntity.duedate.value.getTime()).toEqual(taskPrimitives.dueDate.getTime())
        })
    })
})