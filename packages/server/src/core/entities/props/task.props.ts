import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';

export interface TaskProps {
    publicId: TaskIdVo
    objective: TaskObjectiveVo
    description: TaskDescriptionVo
    status: TaskStatusVo
    priority: TaskPriorityVo
    assignedTo: MemberIdVo | null
    creatorId: MemberIdVo
    projectId: ProjectIdVo
    completedAt: DateVo | null
    dueDate: DateVo
}