import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { InfraDomainError } from 'core/errors/domain/domain-classes.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import prisma from 'infrastructure/lib/prisma.js';
import { PrismaTaskRepository } from 'infrastructure/repositories/task.prisma.js'
import { TaskMother } from 'test/builders/task.mother.js';
import { seedMemberRandom, seedProjectRandom, seedTaskDefault, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('PrismaTaskRepository - Integration Tests', () => {
    let taskRepository: PrismaTaskRepository

    beforeEach(async () => {

        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        taskRepository = new PrismaTaskRepository(prisma);
    });


    describe('save()', () => {

        it('should successfully INSERT a new task when it does not exist', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            const task = TaskMother.reconstituteDefault({
                creatorId: MemberIdVo.fromId(member.id.value),
                projectId: ProjectIdVo.fromId(project.id.value),
                assignedTo: null
            });

            const savedTask = await taskRepository.save(task);

            expect(savedTask).toBeDefined();
            expect(savedTask.id.value).toBe(task.id.value);

            const dbCheck = await prisma.task.findUnique({ where: { id: task.id.value } });
            expect(dbCheck).not.toBeNull();
            expect(dbCheck?.objective).toBe(task.objective.value);
        });

        it('should successfully UPDATE an existing task status/priority (Upsert)', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);


            const task = await seedTaskDefault(prisma, project.id.value, member.id.value, null);


            const updatedProps = TaskMother.reconstituteDefault({
                projectId: ProjectIdVo.fromId(project.id.value),
                creatorId: MemberIdVo.fromId(member.id.value),
                assignedTo: null,
                status: TaskStatusVo.create('doing'),
                priority: TaskPriorityVo.create('high'),
                objective: TaskObjectiveVo.create(task.objective.value)
            });


            const updatedTask = await taskRepository.save(updatedProps);

            expect(updatedTask.status.value).toBe('DOING');
            expect(updatedTask.priority.value).toBe('HIGH');

            const dbCheck = await prisma.task.findUnique({ where: { id: task.id.value } });
            expect(dbCheck?.status).toBe('DOING');
            expect(dbCheck?.priority).toBe('HIGH');
        });

        it('should successfully INSERT a task with NO assignee (assignedTo: null) without breaking mapper structures', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            const unassignedTask = TaskMother.reconstituteDefault({
                creatorId: MemberIdVo.fromId(member.id.value),
                projectId: ProjectIdVo.fromId(project.id.value),
                assignedTo: null
            });

            const savedTask = await taskRepository.save(unassignedTask);

            expect(savedTask).toBeDefined();
            expect(savedTask.assignedTo).toBeNull();

            const dbCheck = await prisma.task.findUnique({ where: { id: unassignedTask.id.value } });
            expect(dbCheck?.assigned_to).toBeNull();
        });

        it('should successfully UPDATE a task to COMPLETED status and persist the completion timestamp', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);


            const task = await seedTaskDefault(prisma, project.id.value, member.id.value, null, {
                status: TaskStatusVo.create('todo'),
                completedAt: null
            });

            const completionDate = DateVo.create();
            const completedDomainTask = TaskEntityClass.reconstitute({
                publicId: task.publicId,
                objective: task.objective,
                description: task.description,
                status: TaskStatusVo.create('completed'),
                priority: task.priority,
                assignedTo: null,
                creatorId: task.creatorId,
                projectId: task.projectId,
                dueDate: task.duedate,
                completedAt: completionDate
            }, task.id, task.createdAtDate, DateVo.create(), undefined, member.publicId);


            const result = await taskRepository.save(completedDomainTask);

            expect(result.status.value).toBe('COMPLETED');
            expect(result.completedAtDate).toBeTruthy();

            const dbCheck = await prisma.task.findUnique({ where: { id: task.id.value } });
            expect(dbCheck?.status).toBe('COMPLETED');
            expect(dbCheck?.completed_at).not.toBeNull();
        });

    });

    describe('findById() and findByPublicId()', () => {

        it('should return the mapped task domain entity with its relations when ids exist', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            const task = await seedTaskRandom(prisma, project.id.value, member.id.value);

            const foundById = await taskRepository.findById(TaskIdVo.fromId(task.id.value));
            expect(foundById).not.toBeNull();
            expect(foundById?.id.value).toBe(task.id.value);

            const foundByPublicId = await taskRepository.findByPublicId(TaskIdVo.fromId(task.publicId.value));
            expect(foundByPublicId).not.toBeNull();
            expect(foundByPublicId?.publicId.value).toBe(task.publicId.value);
        });

        it('should return null cleanly when the searched id does not exist', async () => {
            const randomId = TaskIdVo.fromId('e2654318-208b-4d4b-ae84-82559fd108a9');

            const result = await taskRepository.findById(randomId);
            expect(result).toBeNull();
        });
    });

    describe('findByProject()', () => {

        it('should return all tasks belonging to a specific project ordered by created_at desc', async () => {
            vi.useFakeTimers()

            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            const oldTask = await seedTaskRandom(prisma, project.id.value, member.id.value, null, { objective: TaskObjectiveVo.create('testing the old task') });

            vi.advanceTimersByTime(2)

            const newTask = await seedTaskRandom(prisma, project.id.value, member.id.value);

            const tasks = await taskRepository.findByProject(ProjectIdVo.fromId(project.id.value));

            expect(tasks.length).toBe(2);

            expect(tasks[0].id.value).toBe(newTask.id.value);
            expect(tasks[1].id.value).toBe(oldTask.id.value);

            vi.useRealTimers()
        });
    });

    describe('hasUserTaskPendings()', () => {

        it('should return true if the user has active tasks assigned that are NOT completed or todo', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);


            await seedTaskDefault(prisma, project.id.value, member.id.value, member.id.value, {
                status: TaskStatusVo.create('doing')
            });

            const hasPendings = await taskRepository.hasUserTaskPendings(
                ProjectIdVo.fromId(project.id.value),
                MemberIdVo.fromId(member.id.value)
            );

            expect(hasPendings).toBe(true);
        });

        it('should return false if all assigned tasks are in todo or completed state', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            // IGNORED USER MEMBER TASKS
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('todo') });
            await seedTaskDefault(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('completed') });

            // PENDING TASKS THAT DOES NOT BELONG TO USER MEMBER (SHOULD NOT BE TAKEN AS PART OF THE USER PENDING TASKS)
            await seedTaskRandom(prisma, project.id.value, member.id.value, null, { status: TaskStatusVo.create('doing') });

            const hasPendings = await taskRepository.hasUserTaskPendings(
                ProjectIdVo.fromId(project.id.value),
                MemberIdVo.fromId(member.id.value)
            );

            expect(hasPendings).toBe(false);
        });
    });

    describe('hasPendingTasks()', () => {

        it('should evaluate true if the project contains any task whose status is NOT completed', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            await seedTaskDefault(prisma, project.id.value, member.id.value, null, { status: TaskStatusVo.create('review') });

            const result = await taskRepository.hasPendingTasks(ProjectIdVo.fromId(project.id.value));
            expect(result).toBe(true);
        });

        it('should evaluate false if all tasks within the project are completed', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            await seedTaskDefault(prisma, project.id.value, member.id.value, null, { status: TaskStatusVo.create('completed') });

            const result = await taskRepository.hasPendingTasks(ProjectIdVo.fromId(project.id.value));
            expect(result).toBe(false);
        });
    });

    describe('hasTasks()', () => {

        it('should return true if the project has at least one task row registered', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            let hasAnyTask = await taskRepository.hasTasks(ProjectIdVo.fromId(project.id.value));
            expect(hasAnyTask).toBe(false);

            await seedTaskRandom(prisma, project.id.value, member.id.value);

            hasAnyTask = await taskRepository.hasTasks(ProjectIdVo.fromId(project.id.value));
            expect(hasAnyTask).toBe(true);
        });
    });

    describe('countActiveTaskByUser()', () => {

        it('should return the strict sum of user tasks matching DOING, REVIEW or OVERDUE states', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);

            // VALID ACTIVE TASKS BY USER MEMBER
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('doing') });
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('review') });
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('overdue') });

            // IGNORED TASKS BY USER MEMBER (NOT ACTIVE)
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('todo') });
            await seedTaskRandom(prisma, project.id.value, member.id.value, member.id.value, { status: TaskStatusVo.create('completed') });

            // IGNORED ACTIVE TASK THAT DOES NOT BELONG TO USER MEMBER (SHOULD NOT BE COUNTED)
            await seedTaskRandom(prisma, project.id.value, member.id.value, null, { status: TaskStatusVo.create('doing') });

            const activeCount = await taskRepository.countActiveTaskByUser(
                ProjectIdVo.fromId(project.id.value),
                MemberIdVo.fromId(member.id.value)
            );

            expect(activeCount).toBe(3);
        });
    });

    describe('Repository Exception Handling', () => {

        it('should intercept database erratic behaviors and wrap them inside an infrastructure domain exception', async () => {
            const brokenPrisma = new Proxy(prisma, {
                get: () => { throw new Error('Database connection lost unexpectedly'); }
            });
            const brokenRepository = new PrismaTaskRepository(brokenPrisma);

            const dummyId = TaskIdVo.create();

            await expect(brokenRepository.findById(dummyId))
                .rejects
                .toBeInstanceOf(InfraDomainError);
        });
    });

})