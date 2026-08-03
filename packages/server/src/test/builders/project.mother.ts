import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { ProjectProps } from 'core/entities/props/project.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';

export class ProjectMother {

    static createDefault() {
        return ProjectEntityClass.create({
            publicId: ProjectIdVo.create(),
            title: ProjectTitleVo.create('Project title example'),
            description: ProjectDescriptionVo.create('Project description example'),
            category: ProjectCategoryVo.create(ProjectCategoryVo.DEVELOPMENT_ENGINEERING),
            status: ProjectStatusVo.create('planned'),
            ownerId: UserIdVo.create(),
            archivedAt: null,
            completedAt: null
        }, ProjectIdVo.create())
    }

    static createWithPersonalizedProps(overrides?: Partial<ProjectProps>) {
        const defaults = {
            publicId: ProjectIdVo.create(),
            title: ProjectTitleVo.create('Project title reconstituted'),
            description: ProjectDescriptionVo.create('Project description reconstituted'),
            category: ProjectCategoryVo.create(ProjectCategoryVo.DEVELOPMENT_ENGINEERING),
            status: ProjectStatusVo.create('planned'),
            ownerId: UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1'),
            archivedAt: null,
            completedAt: null,
            ...overrides
        }

        return ProjectEntityClass.create(defaults, ProjectIdVo.create())
    }

    static reconstituteDefault(overrides?: Partial<ProjectProps>) {

        const defaults = {
            publicId: ProjectIdVo.create(),
            title: ProjectTitleVo.create('Project title reconstituted'),
            description: ProjectDescriptionVo.create('Project description reconstituted'),
            category: ProjectCategoryVo.create(ProjectCategoryVo.DEVELOPMENT_ENGINEERING),
            status: ProjectStatusVo.create('planned'),
            ownerId: UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1'),
            archivedAt: null,
            completedAt: null,
            ...overrides
        }

        return ProjectEntityClass.reconstitute(defaults,
            ProjectIdVo.fromId('63158e2a-1941-4775-9980-496a843e9336'),
            DateVo.create(),
            DateVo.create(),
            UserIdVo.fromId('89279093-60b6-455a-bd54-d9006616428d'))
    }

    static reconstituteCompleted() {
        return this.reconstituteDefault({
            status: ProjectStatusVo.create('completed'),
            completedAt: DateVo.create(),
        })
    }

    static reconstituteArchived() {
        return this.reconstituteDefault({
            status: ProjectStatusVo.create('archived'),
            archivedAt: DateVo.create(),
        })
    }

    static reconstituteArchivedCompleted() {
        return this.reconstituteDefault({
            archivedAt: DateVo.create(),
            completedAt: DateVo.create(),
            status: ProjectStatusVo.create('archived')
        })
    }

    static reconstituteInProgress() {
        return this.reconstituteDefault({
            status: ProjectStatusVo.create('in_progress')
        })
    }

}