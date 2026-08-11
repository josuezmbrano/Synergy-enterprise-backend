import { TaskErrorCodes } from '../code/task.codes.js';
import { TaskDomainError } from '../domain/domain-classes.error.js';
import { TaskRuleErrorMessages } from '../messages/task.messages.js';
import { createReverseMap } from '../utils/reverse-map.error.js';

const reverseMap = createReverseMap(TaskErrorCodes)

export const TaskErrorFactory = {

    taskNotFound: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_NOT_FOUND
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task not located on the server for current project', internalCode, code, metadata)
    },

    taskAlreadyExists: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task already exists on the server for current project', internalCode, code, metadata)
    },

    taskValidationFailed: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task input validation failed', internalCode, code, metadata)
    },

    taskCreatorRequired: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_CREATOR_REQUIRED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_004, internalCode, code, metadata)
    },

    taskDuedateInconsistency: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_DUEDATE_INCONSISTENCY
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_005, internalCode, code, metadata)
    },

    taskDoingPendingAssignedTo: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_DOING_PENDING_ASSIGNEDTO
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_006, internalCode, code, metadata)
    },

    taskCompletedLocked: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_COMPLETED_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_007, internalCode, code, metadata)
    },

    taskNotPermittedToEdit: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEDIT
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_008, internalCode, code, metadata)
    },

    taskNotPermittedToExtend: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEXTEND
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_009, internalCode, code, metadata)
    },

    taskProjectInmutable: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_PROJECT_INMUTABLE
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_010, internalCode, code, metadata)
    },

    taskOverdueLocked: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_OVERDUE_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_011, internalCode, code, metadata)
    },

    taskInvalidTransition: (message: string, metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_INVALID_TRANSITION
        const code = reverseMap(internalCode)

        return new TaskDomainError(message, internalCode, code, metadata)
    },

    taskReviewLocked: (message: string, metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_REVIEW_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(message, internalCode, code, metadata)
    },

    taskAssignmentMismatch: (metadata?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_ASSIGNMENT_MISMATCH
        const code = reverseMap(internalCode)

        return new TaskDomainError(TaskRuleErrorMessages.TSK_ERR_14, internalCode, code, metadata)
    }

}