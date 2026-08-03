import { DateVo } from 'core/value-objects/common/date.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';

export interface ProjectProps {
    publicId: ProjectIdVo
    title: ProjectTitleVo
    description: ProjectDescriptionVo
    category: ProjectCategoryVo
    status: ProjectStatusVo
    ownerId: UserIdVo
    archivedAt: DateVo | null
    completedAt: DateVo | null
}