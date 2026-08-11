import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { BaseEntity } from '../base.entity.js';
import { TaskProps } from '../props/task.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { TaskPriorityOptions, TaskStatusOptions } from '@project/common/constants/task.constants.js';



export class TaskEntityClass extends BaseEntity<TaskIdVo, TaskProps> {

    private readonly _assignedToPublicId?: MemberIdVo
    private readonly _creatorPublicId?: MemberIdVo

    private constructor(id: TaskIdVo, props: TaskProps, createdAt?: DateVo, updatedAt?: DateVo, assignedToPublicId?: MemberIdVo, creatorPublicId?: MemberIdVo) {
        super(id, props, createdAt, updatedAt)
        this._assignedToPublicId = assignedToPublicId
        this._creatorPublicId = creatorPublicId
    }


    // MAIN METHODS
    public static create(props: TaskProps, id?: TaskIdVo): TaskEntityClass {

        const finalId = id ? id : TaskIdVo.create()

        return new TaskEntityClass(finalId, { ...props })
    }

    public static reconstitute(props: TaskProps, id: TaskIdVo, createdAt: DateVo, updatedAt: DateVo, assignedToPublicId?: MemberIdVo, creatorPublicId?: MemberIdVo): TaskEntityClass {
        return new TaskEntityClass(id, { ...props }, createdAt, updatedAt, assignedToPublicId, creatorPublicId)
    }


    public get publicId() {
        return this._props.publicId
    }

    public get projectId() {
        return this._props.projectId
    }

    public get objective() {
        return this._props.objective
    }

    public get description() {
        return this._props.description
    }

    public get status() {
        return this._props.status
    }

    public get priority() {
        return this._props.priority
    }

    public get assignedTo() {
        return this._props.assignedTo
    }

    public get assignedToPublicId(): MemberIdVo | undefined {
        return this._assignedToPublicId
    }

    public get creatorId() {
        return this._props.creatorId
    }

    public get creatorPublicId(): MemberIdVo | undefined {
        return this._creatorPublicId
    }

    public get createdAtDate() {
        return this.createdAt
    }

    public get updatedAtDate() {
        return this.updatedAt
    }

    public get completedAtDate() {
        return this._props.completedAt
    }

    public get duedate() {
        return this._props.dueDate
    }

    // TO PRIMITIVES METHODS
    public toPrimitives() {
        return {
            id: this.id.value,
            publicId: this._props.publicId.value,
            objective: this._props.objective.value,
            description: this._props.description.value,
            status: this._props.status.value as TaskStatusOptions,
            priority: this._props.priority.value as TaskPriorityOptions,
            assignedTo: this._props.assignedTo?.value ?? null,
            assignedToPublicId: this._assignedToPublicId?.value,
            creatorId: this._props.creatorId.value,
            creatorPublicId: this._creatorPublicId?.value,
            projectId: this._props.projectId.value,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value,
            completedAt: this._props.completedAt?.value ?? null,
            dueDate: this._props.dueDate.value
        }
    }


    // PRIVATE HELPERS ////////////////////////////////////////////////////////
    private ensureIsNotLocked(propToModify: string): void {
        if (this._props.status.isCompleted()) {
            throw TaskErrorFactory.taskCompletedLocked({
                task: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'COMPLETED_RECORD_INMUTABLE',
                constraint: 'edit_completed_forbidden'
            })
        }
    }

    private ensureIsNotReview(propToModify: string): void {
        if (this._props.status.isReview()) {
            throw TaskErrorFactory.taskReviewLocked(
                'Error: Cannot update this content while task is being reviewed',
                {
                    task: this._props.publicId.value,
                    propToModify: propToModify,
                    reason: 'REVIEW_STATUS_LOCKED',
                    constraint: 'content_immutable_during_review'
                }
            )
        }
    }

    private ensureIsAssigned(propToModify: string): void {
        if (!this._props.assignedTo) {
            throw TaskErrorFactory.taskDoingPendingAssignedTo({
                task: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'MISSING_TASK_ASSIGNEE',
                constraint: 'missing_required_assignee_for_operational_status'
            })
        }
    }

    private ensureIsNotExpired(propToModify: string): void {
        if (this._props.dueDate.isBefore(DateVo.create()) || this._props.status.isOverDue()) {
            throw TaskErrorFactory.taskOverdueLocked({
                task: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'EXPIRED_TASK_LOCKED',
                constraint: 'cannot_modify_expired_task'
            })
        }
    }

    private ensureTargetMatchesAssignee(target: MemberIdVo, propToModify: string) {
        if (!this._props.assignedTo?.equals(target)) {
            throw TaskErrorFactory.taskAssignmentMismatch({
                task: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'MEMBER_ASSIGNED_MISMATCH',
                constraint: 'this_user_is_no_longer_tasked_with_this.'
            })
        }
    }

    
    private updatePriority(newPriority: TaskPriorityVo): void {
        if (this._props.priority.equals(newPriority)) return

        this.ensureIsNotExpired('priority')
        this.ensureIsNotLocked('priority')
        this.ensureIsNotReview('priority')

        this._props.priority = newPriority
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////////


    // BUSINESS LOGIC METHODS

    // CONSULT INFORMATION
    // USED TO PASS INFO TO DIFFERENT ENTITIES
    public isCreatedBy(creatorId: MemberIdVo): boolean {
        return this._props.creatorId.equals(creatorId)
    }

    
    // UPDATE METHODS /////////////////////////////////////////////////////////////////////////////

    // DESCRIPTION PROPS METHODS///////////////////////////////////////////////
    public updateObjective(newObjective: TaskObjectiveVo): void {

        this.ensureIsNotLocked('objective')
        this.ensureIsNotReview('objective')
        this.ensureIsNotExpired('objective')

        if (this._props.objective.equals(newObjective)) return

        this._props.objective = newObjective
        this.markAsUpdated()
    }

    public updateDescription(newDescription: TaskDescriptionVo): void {

        this.ensureIsNotLocked('description')
        this.ensureIsNotReview('description')
        this.ensureIsNotExpired('description')

        if (this._props.description.equals(newDescription)) return

        this._props.description = newDescription
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // STATUS PROP METHODS ////////////////////////////////////////////////////
    public moveToDoing(userAssigned: MemberIdVo): void {

        this.ensureIsNotLocked('status')
        this.ensureIsNotExpired('status')
        this.ensureIsAssigned('status')
        this.ensureTargetMatchesAssignee(userAssigned, 'status')

        const statusTarget = TaskStatusVo.create('doing')

        if (this._props.status.equals(statusTarget)) return

        if (!this._props.status.isTodo()) {
            throw TaskErrorFactory.taskInvalidTransition(
                'Error: The requested status transition follows an incorrect sequence.',
                {
                    task: this._props.publicId.value,
                    propToModify: 'status',
                    from: this._props.status.value,
                    to: 'DOING',
                    reason: 'STATUS_FLOW_VIOLATION',
                    constraint: 'task_must_start_from_todo'
                }
            )
        }

        this._props.status = statusTarget
        this._props.completedAt = null
        this.markAsUpdated()
    }

    public moveToReview(userAssigned: MemberIdVo): void {

        this.ensureIsNotLocked('status')
        this.ensureIsNotExpired('status')
        this.ensureIsAssigned('status')
        this.ensureTargetMatchesAssignee(userAssigned, 'status')

        const statusTarget = TaskStatusVo.create('review')

        if (this._props.status.equals(statusTarget)) return

        if (!this._props.status.isDoing()) {
            throw TaskErrorFactory.taskInvalidTransition(
                'Error: The requested status transition follows an incorrect sequence.',
                {
                    task: this._props.publicId.value,
                    propToModify: 'status',
                    from: this._props.status.value,
                    to: 'REVIEW',
                    reason: 'STATUS_FLOW_VIOLATION',
                    constraint: 'task_must_start_from_doing'
                }
            )
        }

        this._props.status = statusTarget
        this._props.completedAt = null
        this.markAsUpdated()
    }

    public moveToCompleted(userAssigned: MemberIdVo): void {

        this.ensureIsNotExpired('status')
        this.ensureIsAssigned('status')
        this.ensureTargetMatchesAssignee(userAssigned, 'status')

        const statusTarget = TaskStatusVo.create('completed')

        if (this._props.status.equals(statusTarget)) return

        if (!this._props.status.isReview()) {
            throw TaskErrorFactory.taskInvalidTransition(
                'Error: The requested status transition follows an incorrect sequence.',
                {
                    task: this._props.publicId.value,
                    propToModify: 'status',
                    from: this._props.status.value,
                    to: 'COMPLETED',
                    reason: 'STATUS_FLOW_VIOLATION',
                    constraint: 'task_must_start_from_review'
                }
            )
        }

        this._props.status = statusTarget
        this._props.completedAt = DateVo.create()
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////////
    // PRIORITY PROP METHODS //////////////////////////////////////////////////////
    public moveToLow(): void {

        const priorityTarget = TaskPriorityVo.create('low')
        this.updatePriority(priorityTarget)
    }

    public moveToMedium(): void {
     
        const priorityTarget = TaskPriorityVo.create('medium')
        this.updatePriority(priorityTarget)
    }

    public moveToHigh(): void {

        const priorityTarget = TaskPriorityVo.create('high')
        this.updatePriority(priorityTarget)
    }

    public moveToCritical(): void {

        const priorityTarget = TaskPriorityVo.create('critical')
        this.updatePriority(priorityTarget)
    }

    ///////////////////////////////////////////////////////////////////////////////
    // ASSIGNED PROP METHODS //////////////////////////////////////////////////////
    public assignTo(memberToAssign: MemberIdVo): void {

        this.ensureIsNotExpired('assignedTo')
        this.ensureIsNotLocked('assignedTo')
        this.ensureIsNotReview('assignedTo')

        if (this._props.assignedTo) {
            if (this._props.assignedTo.equals(memberToAssign)) return
        }

        this._props.assignedTo = memberToAssign
        this.markAsUpdated()
    }

    public unassignFrom(memberToUnassign: MemberIdVo): void {

        this.ensureIsNotExpired('assignedTo')
        this.ensureIsNotLocked('assignedTo')
        this.ensureIsNotReview('assignedTo')

        this.ensureIsAssigned('assignedTo')
        this.ensureTargetMatchesAssignee(memberToUnassign, 'assignedTo')

        if (!this._props.status.isTodo()) {
            throw TaskErrorFactory.taskDoingPendingAssignedTo({
                task: this._props.publicId.value,
                propToModify: 'assignedTo',
                reason: 'CANNOT_UNASSIGN_ACTIVE_TASK',
                constraint: 'task_must_be_in_todo_to_unassign'
            })
        }

        this._props.assignedTo = null
        this.markAsUpdated()
    }

    public extendDueDate(newDueDate: DateVo): void {

        this.ensureIsNotLocked('dueDate')

        if (this.createdAt.isAfter(newDueDate)) {
            throw TaskErrorFactory.taskDuedateInconsistency({
                task: this._props.publicId.value,
                propToModify: 'dueDate',
                reason: 'INVALID_DUE_DATE',
                constraint: 'due_date_before_creation'
            })
        }

        const nowVo = DateVo.startOfDay(new Date())

        if (newDueDate.isBefore(nowVo)) {
            throw TaskErrorFactory.taskDuedateInconsistency({
                task: this._props.publicId.value,
                propToModify: 'dueDate',
                reason: 'INVALID_DUE_DATE',
                constraint: 'due_date_before_current_time'
            })
        }

        if (this._props.status.isOverDue()) {
            this._props.status = TaskStatusVo.create('todo')
        }

        if (this._props.dueDate.equals(newDueDate)) return

        this._props.dueDate = newDueDate
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // OVERDUE AUTOMATIC UNIQUE METHOD ////////////////////////////////////////
    public markAsOverdue(): void {

        if (!this._props.dueDate.isBefore(DateVo.create())) return

        if (this._props.status.isOverDue()) return;
        if (this._props.status.isCompleted()) return

        this._props.status = TaskStatusVo.create('overdue')
        this._props.priority = TaskPriorityVo.create('critical')

        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////





}