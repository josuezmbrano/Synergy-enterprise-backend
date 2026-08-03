import { TaskErrorCodes } from '../code/task.codes.js';

export const TaskRuleErrorMessages = {
   [TaskErrorCodes.TASK_CREATOR_REQUIRED]: 'Error: A creator is required for a task to exist.',
   [TaskErrorCodes.TASK_DUEDATE_INCONSISTENCY]: 'Error: DueDate cannot be earlier than creation date and current time',
   [TaskErrorCodes.TASK_DOING_PENDING_ASSIGNEDTO]: 'Error: Transicioning a task status from TODO requires the task to be assigned to a member',
   [TaskErrorCodes.TASK_COMPLETED_LOCKED]: 'Error: Completed tasks are Read-Only and cannot be modified',
   [TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEDIT]: 'Error: Only creators and project owner can make modifications on the task',
   [TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEXTEND]: 'Error: Only creators and project owner can extend duedates',
   [TaskErrorCodes.TASK_PROJECT_INMUTABLE]: 'Error: A task can only be part of one project and is not transferable',
   [TaskErrorCodes.TASK_OVERDUE_LOCKED]: 'Error: Overdue tasks are Read-Only and cannot be modified',
   [TaskErrorCodes.TASK_ASSIGNMENT_MISMATCH]: 'Error: The task is no longer assigned to this user.'
} as const