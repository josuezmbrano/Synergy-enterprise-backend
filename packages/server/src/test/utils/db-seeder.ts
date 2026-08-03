import { MemberRoleOptions, MemberStatusOptions } from '@project/common/constants/member.constants.js';
import { ProjectStatusOptions } from '@project/common/constants/project.constants.js';
import { TaskPriorityOptions, TaskStatusOptions } from '@project/common/constants/task.constants.js';
import { UserStatusOptions } from '@project/common/constants/user.constants.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { MemberProps } from 'core/entities/props/member.props.js';
import { ProjectProps } from 'core/entities/props/project.props.js';
import { TaskProps } from 'core/entities/props/task.props.js';
import { TokenProps } from 'core/entities/props/token.props.js';
import { UserProps } from 'core/entities/props/user.props.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { ProjectMapper } from 'infrastructure/mappers/project.mapper.js';
import { MemberMother } from 'test/builders/member.mother.js';
import { ProjectMother } from 'test/builders/project.mother.js';
import { TaskMother } from 'test/builders/task.mother.js';
import { TokenMother } from 'test/builders/token.mother.js';
import { UserMother } from 'test/builders/user.mother.js';


// USER SEEDERS //////////
export const seedUserDefault = async (prisma: PrismaClient, overrides?: Partial<UserProps>): Promise<UserEntityClass> => {


    const user = UserMother.reconstituteDefault(overrides)

    await prisma.user.create({
        data: {
            id: user.id.value,
            public_id: user.publicId.value,
            email: user.email.value,
            name: user.name.value,
            lastname: user.lastname.value,
            username: user.username.value,
            password: user.password.value,
            status: user.status.value as UserStatusOptions,
            verified_at: user.verifiedAtDate?.toISO() ?? null,
            username_updated_at: user.usernameUpdatedAtDate?.toISO() ?? null
        }
    })

    return user
}


export const seedUserRandom = async (prisma: PrismaClient, overrides?: Partial<UserProps>): Promise<UserEntityClass> => {

    const user = UserMother.createDefault(overrides)

    await prisma.user.create({
        data: {
            id: user.id.value,
            public_id: user.publicId.value,
            email: user.email.value,
            name: user.name.value,
            lastname: user.lastname.value,
            username: user.username.value,
            password: user.password.value,
            status: user.status.value as UserStatusOptions,
            verified_at: user.verifiedAtDate?.toISO() ?? null,
            username_updated_at: user.usernameUpdatedAtDate?.toISO() ?? null
        }
    })

    return user
}


// PROJECT SEEDERS ///////////
export const seedProjectDefault = async (prisma: PrismaClient, ownerId: string, overrides?: Partial<ProjectProps>): Promise<ProjectEntityClass> => {

    const project = ProjectMother.reconstituteDefault({
        ...overrides,
        ownerId: UserIdVo.fromId(ownerId)
    });


    const categoryKey = project.category.value as keyof typeof ProjectMapper.DOMAIN_TO_PRISMA_CATEGORY
    const prismaCategory = ProjectMapper.DOMAIN_TO_PRISMA_CATEGORY[categoryKey];

    if (!prismaCategory) {
        throw new Error(`[seedProjectDefault] The domain category'${project.category.value}' does not have a mapped definition in ProjectMapper.`);
    }

    await prisma.project.create({
        data: {
            id: project.id.value,
            public_id: project.publicId.value,
            title: project.title.value,
            description: project.description.value,
            status: project.status.value as ProjectStatusOptions,
            archived_at: project.archivedAtDate?.toISO() ?? null,
            completed_at: project.completedAtDate?.toISO() ?? null,
            owner_id: ownerId,
            category: prismaCategory
        }
    })

    return project
}

export const seedProjectRandom = async (prisma: PrismaClient, ownerId: string, overrides?: Partial<ProjectProps>): Promise<ProjectEntityClass> => {

    const project = ProjectMother.createWithPersonalizedProps({
        ...overrides,
        ownerId: UserIdVo.fromId(ownerId)
    });

    const categoryKey = project.category.value as keyof typeof ProjectMapper.DOMAIN_TO_PRISMA_CATEGORY
    const prismaCategory = ProjectMapper.DOMAIN_TO_PRISMA_CATEGORY[categoryKey];

    if (!prismaCategory) {
        throw new Error(`[seedProjectDefault] The domain category'${project.category.value}' does not have a mapped definition in ProjectMapper.`);
    }

    await prisma.project.create({
        data: {
            id: project.id.value,
            public_id: project.publicId.value,
            title: project.title.value,
            description: project.description.value,
            status: project.status.value as ProjectStatusOptions,
            archived_at: project.archivedAtDate?.toISO() ?? null,
            completed_at: project.completedAtDate?.toISO() ?? null,
            owner_id: ownerId,
            category: prismaCategory
        }
    })

    return project
}



// MEMBER SEEDERS //////////

export const seedMemberDefault = async (prisma: PrismaClient, projectId: string, userId: string, overrides?: Partial<MemberProps>): Promise<MemberEntityClass> => {

    const member = MemberMother.reconstituteDefault({
        ...overrides,
        projectId: ProjectIdVo.fromId(projectId),
        userId: UserIdVo.fromId(userId)
    });


    await prisma.member.create({
        data: {
            id: member.id.value,
            public_id: member.publicId.value,
            project_id: projectId,
            user_id: userId,
            role: member.role.value as MemberRoleOptions,
            status: member.status.value as MemberStatusOptions,
            joined_at: member.joinedAtDate.toISO()
        }
    });

    return member;
};

export const seedMemberRandom = async (prisma: PrismaClient, projectId: string, userId: string, overrides?: Partial<MemberProps>): Promise<MemberEntityClass> => {

    const member = MemberMother.createDefault({
        ...overrides,
        projectId: ProjectIdVo.fromId(projectId),
        userId: UserIdVo.fromId(userId)
    });


    await prisma.member.create({
        data: {
            id: member.id.value,
            public_id: member.publicId.value,
            project_id: projectId,
            user_id: userId,
            role: member.role.value as any,
            status: member.status.value as any,
            joined_at: member.joinedAtDate.toISO()
        }
    });

    return member;
};



// TASK SEEDERS /////////
export async function seedTaskDefault(prisma: PrismaClient, projectId: string, creatorId: string, assignedToId: string | null = null, overrides?: Partial<TaskProps>): Promise<TaskEntityClass> {

    const task = TaskMother.reconstituteDefault({
        projectId: ProjectIdVo.fromId(projectId),
        creatorId: MemberIdVo.fromId(creatorId),
        assignedTo: assignedToId ? MemberIdVo.fromId(assignedToId) : null,
        ...overrides
    })

    await prisma.task.create({
        data: {
            id: task.id.value,
            public_id: task.publicId.value,
            objective: task.objective.value,
            description: task.description.value,
            status: task.status.value as TaskStatusOptions,
            priority: task.priority.value as TaskPriorityOptions,
            due_date: task.duedate.toISO(),
            assigned_to: task.assignedTo?.value ?? null,
            project_id: task.projectId.value,
            creator_id: task.creatorId.value,
            completed_at: task.completedAtDate?.toISO() ?? null
        }
    })

    return task
}

export async function seedTaskRandom(prisma: PrismaClient, projectId: string, creatorId: string, assignedToId: string | null = null, overrides?: Partial<TaskProps>): Promise<TaskEntityClass> {

    const task = TaskMother.createPersonalized(overrides)

    await prisma.task.create({
        data: {
            id: task.id.value,
            public_id: task.publicId.value,
            objective: task.objective.value,
            description: task.description.value,
            status: task.status.value as TaskStatusOptions,
            priority: task.priority.value as TaskPriorityOptions,
            due_date: task.duedate.toISO(),
            assigned_to: assignedToId ?? null,
            project_id: projectId,
            creator_id: creatorId,
            completed_at: task.completedAtDate?.toISO() ?? null
        }
    })

    return task
}



// TOKEN SEEDERS ////////

export async function seedTokenDefault(prisma: PrismaClient, userPublicId: string, overrides?: Partial<TokenProps>): Promise<VerificationTokenEntityClass> {

    const token = TokenMother.reconstituteDefault({
        userId: UserIdVo.fromId(userPublicId),
        ...overrides
    })

    await prisma.verificationToken.create({
        data: {
            token: token.id.value,
            type: token.type.value,
            expires_at: token.expiresAt.toISO(),
            user_id: token.userId.value,
            created_at: token.tokenCreatedAt?.value ?? new Date()
        }
    })

    return token
}

export async function seedTokenRandom(prisma: PrismaClient, userPublicId: string, createdAtValue?: Date): Promise<VerificationTokenEntityClass> {

    const token = TokenMother.createPasswordResetVerification()

    await prisma.verificationToken.create({
        data: {
            token: token.id.value,
            type: token.type.value,
            expires_at: token.expiresAt.toISO(),
            user_id: userPublicId,
            created_at: createdAtValue ?? new Date()
        }
    })

    return token
}