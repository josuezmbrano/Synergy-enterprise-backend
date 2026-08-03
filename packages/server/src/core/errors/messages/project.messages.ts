import { ProjectErrorCodes } from '../code/project.codes.js'

export const ProjectRuleErrorMessages = {
    [ProjectErrorCodes.PROJECT_CATEGORY_INMUTABLE]: 'Error: The category is defined upon creation and cannot be modified.',
    [ProjectErrorCodes.PROJECT_COMPLETED_LOCKED]: 'Error: Completed projects are Read-Only and cannot be modified',
    [ProjectErrorCodes.PROJECT_COMPLETION_PENDING_TASKS]: 'Error: Cannot complete a project if its tasks are: (Todo/Doing/Review)',
    [ProjectErrorCodes.PROJECT_ARCHIVED_LOCKED]: 'Error: Archived projects are Read-Only and cannot be modified',
    [ProjectErrorCodes.PROJECT_NOBACKUP_ADMIN]: 'Error: A project must always have at least one active admin',
    [ProjectErrorCodes.PROJECT_OWNER_INMUTABLE]: 'Error: An owner of a project cannot be modified',
    [ProjectErrorCodes.PROJECT_ARCHIVE_INCONSISTENCY]: 'Error: Archived date/status synchronization error.',
    [ProjectErrorCodes.PROJECT_NOT_OWNER]: 'Error: This action can only be performed by the owner.',
    [ProjectErrorCodes.PROJECT_NOT_OWNER_OR_ADMIN]: 'Error: This action can only be performed by the owner or the administrators of the project.',
    [ProjectErrorCodes.PROJECT_TASKS_REQUIRED]: 'Error: Cannot start a project if it doesnt have tasks related to it.',
    [ProjectErrorCodes.PROJECT_MEMBERS_REQUIRED]: 'Error: Cannot start a project if it doesnt have members related to it.',
    [ProjectErrorCodes.PROJECT_NOT_MEMBER_ERROR]: 'Error: The specified user does not belong to the project.',
    [ProjectErrorCodes.PROJECT_MEMBER_WIP_LIMIT_REACHED]: 'Error: Each project member cannot have more than 3 actives tasks to avoid inneficiency.',
    [ProjectErrorCodes.PROJECT_NOBACKUP_CONTRIBUTORS]: 'Error: A project must always have at least three active contributors',

} as const

