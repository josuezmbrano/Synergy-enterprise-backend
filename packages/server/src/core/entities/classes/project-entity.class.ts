import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { BaseEntity } from '../base.entity.js';
import { ProjectProps } from '../props/project.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { ProjectCategoryOptions, ProjectStatusOptions } from '@project/common/constants/project.constants.js';


export class ProjectEntityClass extends BaseEntity<ProjectIdVo, ProjectProps> {

    get entityType(): string {
        return 'Project'
    }

    private readonly _ownerPublicId?: UserIdVo

    private constructor(props: ProjectProps, id: ProjectIdVo, createdAt?: DateVo, updatedAt?: DateVo, ownerPublicId?: UserIdVo) {
        super(id, props, createdAt, updatedAt)
        this._ownerPublicId = ownerPublicId
        this.ensureInvariants()
    }


    // MAIN METHODS

    public static create(props: ProjectProps, id?: ProjectIdVo): ProjectEntityClass {
        const finalId = id ? id : ProjectIdVo.create()
        return new ProjectEntityClass({ ...props }, finalId)
    }

    public static reconstitute(props: ProjectProps, id: ProjectIdVo, createdAt: DateVo, updatedAt: DateVo, ownerPublicId: UserIdVo): ProjectEntityClass {
        return new ProjectEntityClass({ ...props }, id, createdAt, updatedAt, ownerPublicId)
    }

    public get ownerPublicId(): UserIdVo | undefined {
        return this._ownerPublicId
    }

    public get publicId() {
        return this._props.publicId
    }

    public get title() {
        return this._props.title
    }

    public get description() {
        return this._props.description
    }

    public get status() {
        return this._props.status
    }

    public get category() {
        return this._props.category
    }

    public get ownerId() {
        return this._props.ownerId
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

    public get archivedAtDate() {
        return this._props.archivedAt
    }
    
    // TO PRIMITIVES METHOD

    public toPrimitives() {
        return {
            id: this.id.value,
            publicId: this._props.publicId.value,
            title: this._props.title.value,
            description: this._props.description.value,
            category: this._props.category.value as ProjectCategoryOptions,
            status: this._props.status.value as ProjectStatusOptions,
            ownerId: this._props.ownerId.value,
            ownerPublicId: this._ownerPublicId?.value ?? null,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value,
            completedAt: this._props.completedAt?.value ?? null,
            archivedAt: this._props.archivedAt?.value ?? null
        }
    }


    // PRIVATE HELPERS ////////////////////////////////////////////////////////
    private ensureInvariants(): void {
        const status = this._props.status
        const hasArchivedDate = this._props.archivedAt !== null

        if (status.isArchived() && !hasArchivedDate) {
            throw ProjectErrorFactory.projectArchiveInconsistency({
                project: this._props.publicId.value,
                reason: 'ARCHIVED_STATUS_MISSING_DATE',
                description: 'An archived project must have an archived date'
            })
        }

        if (!status.isArchived() && hasArchivedDate) {
            throw ProjectErrorFactory.projectArchiveInconsistency({
                project: this._props.publicId.value,
                reason: 'DATE_PRESENT_WITHOUT_ARCHIVED_STATUS',
                description: 'Project cannot have an archived date if its not archive'
            })
        }
    }

    private ensureIsOwner(actorId: UserIdVo, action: string): void {
        if (!this._props.ownerId.equals(actorId)) {
            throw ProjectErrorFactory.projectNotOwner({
                project: this._props.publicId.value,
                actorId: actorId.value,
                action: action,
                reason: 'ACTION_FORBIDDEN',
                constraint: 'not_project_owner'
            })
        }
    }


    private ensureIsNotCompleted(propToModify: string): void {
        if (this._props.status.isCompleted()) {
            throw ProjectErrorFactory.projectCompletedLocked({
                project: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'COMPLETED_RECORD_INMUTABLE',
                constraint: 'edit_completed_forbidden'
            })
        }
    }

    private ensureIsNotArchived(propToModify: string): void {
        if (this._props.status.isArchived()) {
            throw ProjectErrorFactory.projectArchivedLocked({
                project: this._props.publicId.value,
                propToModify: propToModify,
                reason: 'ARCHIVED_RECORD_INMUTABLE',
                constraint: 'edit_archived_forbidden'
            })
        }
    }


    ///////////////////////////////////////////////////////////////////////////////
    // BUSINESS LOGIC METHODS

    // AUTHORIZATION 
    // USED IN USECASES
    public ensureIsWritable(): void {

        if (this._props.status.isCompleted()) {
            throw ProjectErrorFactory.projectCompletedLocked()
        }
        
        if (this._props.status.isArchived()) {
            throw ProjectErrorFactory.projectArchivedLocked()
        }
    }

    public ensureIsVisible(actorId: UserIdVo): void {

        if (this._props.status.isArchived() && !this._props.ownerId.equals(actorId)) {
            throw ProjectErrorFactory.projectArchivedLocked()
        }
    }
    
    public ensureUserIsOwner(actingUser: UserIdVo): void {
        if (!this._props.ownerId.equals(actingUser)) {
            throw ProjectErrorFactory.projectNotOwner()
        }
    }

    public ensureUserHasWipLimit(activeTasks: number): void {
        if (activeTasks >= 3) {
            throw ProjectErrorFactory.projectWipLimitReached()
        }
    }

    public ensureExistsBackupAdmin(activeAdmins: number): void {
        if (activeAdmins <= 1) {
            throw ProjectErrorFactory.projectNoBackupAdmin()
        }
    }

    public ensureBackupContributorsLimit(activeContributors: number): void {
        if (activeContributors <= 3) {
            throw ProjectErrorFactory.projectNoBackupContributors()
        }
    }

    // CONSULT INFORMATION
    // USED TO PASS INFO TO DIFFERENT ENTITIES
    public isOwner(actorId: UserIdVo): boolean {
        return this._props.ownerId.equals(actorId)
    }

    
    // UPDATE ENTITY /////////////////////////////////////////////////////////////////////////

    // DESCRIPTION PROPS METHODS///////////////////////////////////////////////
    public updateTitle(newTitle: ProjectTitleVo, actorId: UserIdVo) {

        this.ensureIsNotCompleted('title')
        this.ensureIsNotArchived('title')

        this.ensureIsOwner(actorId, 'update title')

        if (this._props.title.equals(newTitle)) return

        this._props.title = newTitle
        this.markAsUpdated()
    }


    public updateDescription(newDescription: ProjectDescriptionVo, actorId: UserIdVo) {

        this.ensureIsNotCompleted('description')
        this.ensureIsNotArchived('description')

        this.ensureIsOwner(actorId, 'update description')

        if (this._props.description.equals(newDescription)) return

        this._props.description = newDescription
        this.markAsUpdated()
    }

    ///////////////////////////////////////////////////////////////////////////
    // STATUS PROP METHODS ////////////////////////////////////////////////////
    public moveToInProgress() {

        this.ensureIsNotArchived('status')

        const statusTarget = ProjectStatusVo.create('in_progress')

        if (this._props.status.equals(statusTarget)) return

        this._props.status = statusTarget
        this._props.completedAt = null
        this._props.archivedAt = null
        this.markAsUpdated()
    }

    public moveToCompleted() {

        this.ensureIsNotArchived('status')

        const statusTarget = ProjectStatusVo.create('completed')

        if (this._props.status.equals(statusTarget)) return

        if (!this._props.status.isInProgress()) {
            throw ProjectErrorFactory.projectInvalidTransition(
                'Error: The requested status transition follows an incorrect sequence.',
                {
                    project: this._props.publicId.value,
                    propToModify: 'status',
                    from: this._props.status.value,
                    to: 'COMPLETED',
                    reason: 'STATUS_FLOW_VIOLATION',
                    constraint: 'project_must_be_in_progress'
                }
            )
        }

        this._props.status = statusTarget
        this._props.completedAt = DateVo.create()
        this._props.archivedAt = null
        this.markAsUpdated()
    }

    public moveToArchived(actorId: UserIdVo) {

        this.ensureIsOwner(actorId, 'archive')
        this.ensureIsNotArchived('status')

        const statusTarget = ProjectStatusVo.create('archived')

        this._props.status = statusTarget
        this._props.archivedAt = DateVo.create()
        this.markAsUpdated()
    }

    public unarchive(actorId: UserIdVo) {

        this.ensureIsOwner(actorId, 'unarchive')

        if (!this._props.status.isArchived()) {
            throw ProjectErrorFactory.projectInvalidTransition(
                'Error: Only archived projects can be unarchived.',
                {
                    project: this._props.publicId.value,
                    propToModify: 'status',
                    reason: 'INVALID_RESTORE_ACTION',
                    constraint: 'not_in_archived_status'
                }
            )
        }

        
        this._props.status = this._props.completedAt?.value
        ? ProjectStatusVo.create('completed') 
        : ProjectStatusVo.create('planned')

        this._props.archivedAt = null
        this.markAsUpdated()
    }
    
    ///////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////

}