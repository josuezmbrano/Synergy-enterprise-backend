import { ProjectDomainError } from 'core/errors/domain/domain-classes.error.js'
import { DateVo } from 'core/value-objects/common/date.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js'
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js'
import { ProjectMother } from 'test/builders/project.mother.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('ProjectEntityClass creation, methods testing and core logic.', () => {

    describe('Creation, reconstitution, and basic calculation testing.', () => {

        it('must create a valid ProjectEntity instance correctly.', () => {

            const projectEntity = ProjectMother.createDefault()

            expect(projectEntity.title.value).toEqual('Project title example')
            expect(projectEntity.status.isPlanned()).toBe(true)
            expect(projectEntity.category.value).toBe('DEVELOPMENT/ENGINEERING')
        })

        it('must reconstitute a valid ProjectEntity instance correctly.', () => {

            const projectEntity = ProjectMother.reconstituteDefault()

            expect(projectEntity.title.value).toEqual('Project title reconstituted')
            expect(projectEntity.id.value).toEqual('63158e2a-1941-4775-9980-496a843e9336')
            expect(projectEntity.ownerId.value).toEqual('b4506041-389f-4316-928d-a4f66542a1b1')
            expect(projectEntity.ownerPublicId?.value).toEqual('89279093-60b6-455a-bd54-d9006616428d')
        })

        it('should correctly return true in isOwner() if ownerId equals actorId', () => {

            const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
            const projectEntity = ProjectMother.reconstituteDefault()

            expect(projectEntity.ownerId.value).toEqual(actorId.value)
            expect(projectEntity.isOwner(actorId)).toBe(true)
        })
    })

    describe('Update entity core logic', () => {

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        describe('Title update.', () => {

            it('should correctly update title and mark updatedAt field on entity', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const newTitle = ProjectTitleVo.create('New title example')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.updateTitle(newTitle, actorId)

                expect(projectEntity.title.value).toEqual('New title example')
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if an user tries to update title on completed project.', () => {

                const projectEntity = ProjectMother.reconstituteCompleted()
                const newTitle = ProjectTitleVo.create('new title example')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')

                expectDomainError(ProjectDomainError, () => projectEntity.updateTitle(newTitle, actorId), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw an ARCHIVED_RECORD_INMUTABLE reason if an user tries to update title on archived project.', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                const newTitle = ProjectTitleVo.create('new title example')

                expectDomainError(ProjectDomainError, () => projectEntity.updateTitle(newTitle, actorId), 3, undefined, 'ARCHIVED_RECORD_INMUTABLE')
            })

            it('should throw an ACTION_FORBIDDEN reason if a NonOwner-user tries to update title', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const actorId = UserIdVo.create()
                const newTitle = ProjectTitleVo.create('new title example')

                expectDomainError(ProjectDomainError, () => projectEntity.updateTitle(newTitle, actorId), 3, undefined, 'ACTION_FORBIDDEN')
            })

            it('should not make any updates if new title has the same value as the title to update', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const newTitle = ProjectTitleVo.create('Project title reconstituted')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.updateTitle(newTitle, actorId)

                expect(projectEntity.title.value).toEqual('Project title reconstituted')
                expect(projectEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Update description.', () => {

            it('should correctly update description and mark updatedAt field on entity', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const newDescription = ProjectDescriptionVo.create('New description example')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.updateDescription(newDescription, actorId)

                expect(projectEntity.description.value).toEqual('New description example')
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw a COMPLETED_RECORD_INMUTABLE reason if an user tries to update description on completed project.', () => {

                const projectEntity = ProjectMother.reconstituteCompleted()
                const newDescription = ProjectDescriptionVo.create('new description example')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')

                expectDomainError(ProjectDomainError, () => projectEntity.updateDescription(newDescription, actorId), 3, undefined, 'COMPLETED_RECORD_INMUTABLE')
            })

            it('should throw an ARCHIVED_RECORD_INMUTABLE reason if an user tries to update description on archived project.', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                const newDescription = ProjectDescriptionVo.create('new description example')

                expectDomainError(ProjectDomainError, () => projectEntity.updateDescription(newDescription, actorId), 3, undefined, 'ARCHIVED_RECORD_INMUTABLE')
            })

            it('should throw an ACTION_FORBIDDEN reason if a NonOwner-user tries to update description', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const actorId = UserIdVo.create()
                const newDescription = ProjectDescriptionVo.create('new description example')

                expectDomainError(ProjectDomainError, () => projectEntity.updateDescription(newDescription, actorId), 3, undefined, 'ACTION_FORBIDDEN')
            })

            it('should not make any updates if new description has the same value as the description to update', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const newDescription = ProjectDescriptionVo.create('Project description reconstituted')
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.updateDescription(newDescription, actorId)

                expect(projectEntity.description.value).toEqual('Project description reconstituted')
                expect(projectEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Project status to IN_PROGRESS.', () => {

            it('should correctly update status to in_progress, secure that completedAt and archivedAt remains null, and mark updatedAt field', () => {

                const projectEntity = ProjectMother.createDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                projectEntity.moveToInProgress()
                expect(projectEntity.status.isInProgress()).toBe(true)
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(projectEntity.completedAtDate).toBeNull()
                expect(projectEntity.archivedAtDate).toBeNull()
            })

            it('should throw an ARCHIVED_RECORD_INMUTABLE reason if an user tries to update status on archived project.', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                expectDomainError(ProjectDomainError, () => projectEntity.moveToInProgress(), 3, undefined, 'ARCHIVED_RECORD_INMUTABLE')
            })

            it('should not make any updates if project status is already in IN_PROGRESS.', () => {

                const projectEntity = ProjectMother.reconstituteInProgress()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                projectEntity.moveToInProgress()
                expect(projectEntity.status.isInProgress()).toBe(true)
                expect(projectEntity.completedAtDate).toBeNull()
                expect(projectEntity.archivedAtDate).toBeNull()
                expect(projectEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })
        })

        describe('Project status to COMPLETED.', () => {

            it('should correctly update status to completed, secure that archivedAt remains null, and mark updatedAt and completedAt fields', () => {

                const projectEntity = ProjectMother.reconstituteInProgress()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                projectEntity.moveToCompleted()
                expect(projectEntity.status.isCompleted()).toBe(true)
                expect(projectEntity.archivedAtDate).toBeNull()
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(projectEntity.completedAtDate).not.toBeNull()
                expect(projectEntity.completedAtDate).toBeInstanceOf(DateVo)
            })

            it('should throw an ARCHIVED_RECORD_INMUTABLE reason if an user tries to update status on archived project.', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                expectDomainError(ProjectDomainError, () => projectEntity.moveToCompleted(), 3, undefined, 'ARCHIVED_RECORD_INMUTABLE')
            })

            it('should not make any updates if project status is already in COMPLETED.', () => {

                const projectEntity = ProjectMother.reconstituteCompleted()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                projectEntity.moveToCompleted()
                expect(projectEntity.status.isCompleted()).toBe(true)
                expect(projectEntity.completedAtDate).not.toBeNull()
                expect(projectEntity.completedAtDate).toBeInstanceOf(DateVo)
                expect(projectEntity.archivedAtDate).toBeNull()
                expect(projectEntity.updatedAtDate.value.getTime()).toEqual(previousUpdatedAt)
            })

            it('should throw a STATUS_FLOW_VIOLATION reason if current status is not IN_PROGRESS when attempting to complete project', () => {

                const projectEntity = ProjectMother.createDefault()
                expectDomainError(ProjectDomainError, () => projectEntity.moveToCompleted(), 3, undefined, 'STATUS_FLOW_VIOLATION')
            })
        })

        describe('Project status to ARCHIVED.', () => {

            it('should correctly update status to archived, and mark updatedAt and archivedAt fields', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.moveToArchived(actorId)

                expect(projectEntity.status.isArchived()).toBe(true)
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
                expect(projectEntity.archivedAtDate).not.toBeNull()
                expect(projectEntity.archivedAtDate).toBeInstanceOf(DateVo)
            })

            it('should throw an ACTION_FORBIDDEN reason if a NonOwner-user tries to archive a project', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const actorId = UserIdVo.create()

                expectDomainError(ProjectDomainError, () => projectEntity.moveToArchived(actorId), 3, undefined, 'ACTION_FORBIDDEN')
            })

            it('should throw an ARCHIVED_RECORD_INMUTABLE reason if an user tries to archive an already archived project.', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')

                expectDomainError(ProjectDomainError, () => projectEntity.moveToArchived(actorId), 3, undefined, 'ARCHIVED_RECORD_INMUTABLE')
            })
        })

        describe('Unarchive a project.', () => {

            it('should correctly unarchive a project, remove archived status, mark archivedAt to null and mark updatedAt field', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const previousUpdatedAt = projectEntity.updatedAtDate.value.getTime()

                vi.advanceTimersByTime(10000)

                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.unarchive(actorId)

                expect(projectEntity.archivedAtDate).toBeNull()
                expect(projectEntity.status.isArchived()).toBe(false)
                expect(projectEntity.updatedAtDate.value.getTime()).toBeGreaterThan(previousUpdatedAt)
            })

            it('should throw an ACTION_FORBIDDEN reason if a NonOwner-user tries to unarchive a project', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const actorId = UserIdVo.create()

                expectDomainError(ProjectDomainError, () => projectEntity.unarchive(actorId), 3, undefined, 'ACTION_FORBIDDEN')
            })

            it('should throw an INVALID_RESTORE_ACTION if an user tries to unarchive a project that is not archived', () => {

                const projectEntity = ProjectMother.reconstituteDefault()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')

                expectDomainError(ProjectDomainError, () => projectEntity.unarchive(actorId), 3, undefined, 'INVALID_RESTORE_ACTION')
            })

            it('should correctly update to planned status when user attemps to unarchive a project that has no completedAt value', () => {

                const projectEntity = ProjectMother.reconstituteArchived()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.unarchive(actorId)

                expect(projectEntity.status.isPlanned()).toBe(true)
            })

            it('should correctly update to completed status when user attemps to unarchive a project that has completedAt value', () => {

                const projectEntity = ProjectMother.reconstituteArchivedCompleted()
                const actorId = UserIdVo.fromId('b4506041-389f-4316-928d-a4f66542a1b1')
                projectEntity.unarchive(actorId)

                expect(projectEntity.status.isCompleted()).toBe(true)
            })
        })

    })

    describe('Data integrity verification', () => {

        it('should return a primitive object with all values correctly synced to VO', () => {

            const projectEntity = ProjectMother.reconstituteDefault()
            const projectPrimitives = projectEntity.toPrimitives()

            expect(projectEntity.id.value).toEqual(projectPrimitives.id)
            expect(projectEntity.publicId.value).toEqual(projectPrimitives.publicId)
            expect(projectEntity.title.value).toEqual(projectPrimitives.title)
            expect(projectEntity.description.value).toEqual(projectPrimitives.description)
            expect(projectEntity.category.value).toEqual(projectPrimitives.category)
            expect(projectEntity.status.value).toEqual(projectPrimitives.status)
            expect(projectEntity.ownerId.value).toEqual(projectPrimitives.ownerId)
            expect(projectEntity.ownerPublicId?.value).toEqual(projectPrimitives.ownerPublicId)
            expect(projectEntity.createdAtDate.value.getTime()).toEqual(projectPrimitives.createdAt.getTime())
            expect(projectEntity.updatedAtDate.value.getTime()).toEqual(projectPrimitives.updatedAt.getTime())
            expect(projectEntity.completedAtDate).toEqual(projectPrimitives.completedAt)
            expect(projectEntity.archivedAtDate).toEqual(projectPrimitives.archivedAt)
        })
    })

    describe('Authorization guards logic', () => {

        it('should throw a ProjectDomain projectCompletedLocked if current project status is completed', () => {

            const projectEntity = ProjectMother.reconstituteCompleted()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureIsWritable(), 3, 'PROJECT_COMPLETED_LOCKED')
        })

        it('should throw a ProjectDomain projectArchivedLocked if current project status is archived', () => {

            const projectEntity = ProjectMother.reconstituteArchived()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureIsWritable(), 3, 'PROJECT_ARCHIVED_LOCKED')
        })

        it('should throw a ProjectDomain projectArchivedLocked if current project status is archived and actor user is not the owner', () => {

            const projectEntity = ProjectMother.reconstituteArchived()
            const actorId = UserIdVo.create()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureIsVisible(actorId), 3, 'PROJECT_ARCHIVED_LOCKED')
        })

        it('should throw a ProjectDomain projectNotOwner if actor user is not the owner', () => {

            const projectEntity = ProjectMother.reconstituteDefault()
            const actorId = UserIdVo.create()

            expectDomainError(ProjectDomainError, () => projectEntity.ensureUserIsOwner(actorId), 3, 'PROJECT_NOT_OWNER')
        })

        it('should throw a ProjectDomain projectWipLimitReached when attempting to start an assigned task to an user that already have 3 tasks started.', () => {

            const projectEntity = ProjectMother.reconstituteInProgress()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureUserHasWipLimit(3), 3, 'PROJECT_MEMBER_WIP_LIMIT_REACHED')
        })

        it('should throw a ProjectDomain projectNoBackupAdmin when attempting to on_leave the last active admin on duty remaining', () => {

            const projectEntity = ProjectMother.reconstituteInProgress()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureExistsBackupAdmin(1), 3, 'PROJECT_NOBACKUP_ADMIN')
        })

        it('should throw a ProjectDomain projectNoBackupContributors when attempting to on_leave a contributor member if there are 3 active contributors on duty remaining', () => {

            const projectEntity = ProjectMother.reconstituteInProgress()
            expectDomainError(ProjectDomainError, () => projectEntity.ensureBackupContributorsLimit(3), 3, 'PROJECT_NOBACKUP_CONTRIBUTORS')
        })
    })

})