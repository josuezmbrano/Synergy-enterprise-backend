import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { IBaseRepository } from './base.repository.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';

export interface IProjectRepository extends IBaseRepository<ProjectIdVo, ProjectEntityClass> {

    exists(internalUserId: UserIdVo, projectTitle: ProjectTitleVo): Promise<boolean>
    findAllVisibleForUser(internalProjectIds: ProjectIdVo[], internalUserId: UserIdVo): Promise<ProjectEntityClass[]>
    findAllByIds(internalProjectIds: ProjectIdVo[]): Promise<ProjectEntityClass[]>
}