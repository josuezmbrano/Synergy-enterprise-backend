import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { IBaseRepository } from './base.repository.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';

export interface ITaskRepository extends IBaseRepository<TaskIdVo, TaskEntityClass> {

    hasTasks(internalProjectId: ProjectIdVo): Promise<boolean>
    hasPendingTasks(internalProjectId: ProjectIdVo): Promise<boolean>
    hasUserTaskPendings(internalProjectId: ProjectIdVo, internalMemberId: MemberIdVo): Promise<boolean>
    countActiveTaskByUser(internalProjectId: ProjectIdVo, internalMemberId: MemberIdVo): Promise<number>
    countTasksByProject(internalProjectId: ProjectIdVo): Promise<number>
    findByProject(internalProjectId: ProjectIdVo): Promise<TaskEntityClass[]>
}