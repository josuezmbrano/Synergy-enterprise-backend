import { CreateProjectOutput } from 'application/dtos/project/create-project.dto.js';
import { CreateProjectInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';

export class CreateProjectCase implements BaseUseCase<CreateProjectInput, CreateProjectOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly unitOfWork: IBaseUnitOfWork
    ) { }

    async execute(input: CreateProjectInput): Promise<CreateProjectOutput> {

        // INSTANTIATE PROJECT VOs 
        const title = ProjectTitleVo.create(input.title)
        const description = ProjectDescriptionVo.create(input.description)
        const category = ProjectCategoryVo.create(input.category)
        const status = ProjectStatusVo.create('planned')
        const actingUserPublicId = UserIdVo.fromId(input.actorId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) { throw UserErrorFactory.userNotFound() }

        userAccount.ensureCanOperate()


        // CHECK FOR EXISTENCE
        const exists = await this.projectRepository.exists(
            userAccount.id, title
        )

        if (exists) {
            throw ProjectErrorFactory.projectAlreadyExists({
                reason: 'RESOURCE_ALREADY_EXISTS',
                constraint: 'unique_project_title_per_user',
                title: title.value
            })
        }


        // INSTANTIATE IDENTIFICATORS 
        const internalId = ProjectIdVo.create()
        const internalMemberId = MemberIdVo.create()
        const memberPublicId = MemberIdVo.create()
        const publicId = ProjectIdVo.create()


        // CREATE PROJECT AND INITIAL MEMBER ENTITY
        const project = ProjectEntityClass.create({
            publicId: publicId,
            title: title,
            description: description,
            category: category,
            status: status,
            ownerId: userAccount.id,
            completedAt: null,
            archivedAt: null
        }, internalId)


        const ownerMember = MemberEntityClass.create({
            publicId: memberPublicId,
            projectId: internalId,
            userId: userAccount.id,
            status: MemberStatusVo.create('active'),
            role: MemberRoleVo.create('admin'),
            joinedAt: DateVo.create()
        }, internalMemberId)


        // RUN AN UNIT OF WORK TO SECURE TRANSACTION OF MULTIPLE OPERATIONS
        const { newProjectPersisted } = await this.unitOfWork.run(async () => {
            // PERSIST ENTITIES ON REPOSITORIES AND CONVERT TO PRIMITIVES
            const newProjectPersisted = await this.projectRepository.save(project)
            await this.memberRepository.save(ownerMember)

            return { newProjectPersisted }
        })

        return this.maptoOutput(newProjectPersisted, userAccount.publicId.value)
    }

    private maptoOutput(project: ProjectEntityClass, ownerPublicId: string): CreateProjectOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            ownerId: ownerPublicId,
            title: primitives.title,
            description: primitives.description,
            updatedAt: project.updatedAtDate.toISO(),
            createdAt: project.createdAtDate.toISO(),
            archivedAt: project.archivedAtDate?.toISO() ?? null,
            completedAt: project.completedAtDate?.toISO() ?? null,
            status: primitives.status,
            category: primitives.category
        }
    }
}