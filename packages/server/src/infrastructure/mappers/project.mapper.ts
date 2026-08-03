import { ProjectCategoryOptions } from '@project/common/constants/project.constants.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { Project as PrismaProject, Prisma, ProjectCategories as PrismaCategory, ProjectStatus } from 'infrastructure/generated/prisma/client.js';



export class ProjectMapper {

    static toDomain(raw: PrismaProject & { owner: { public_id: string } }): ProjectEntityClass {

        try {

            const domainCategory = this.PRISMA_TO_DOMAIN_CATEGORY[raw.category]

            // INSTANTIATE ENTITY VOs
            const id = ProjectIdVo.fromId(raw.id)
            const publicId = ProjectIdVo.fromId(raw.public_id)
            const title = ProjectTitleVo.create(raw.title)
            const description = ProjectDescriptionVo.create(raw.description)
            const category = ProjectCategoryVo.create(domainCategory)
            const status = ProjectStatusVo.create(raw.status)
            const ownerId = UserIdVo.fromId(raw.owner_id)
            const createdAt = DateVo.create(raw.created_at)
            const updatedAt = DateVo.create(raw.updated_at)
            const ownerPublicId = UserIdVo.fromId(raw.owner.public_id)


            return ProjectEntityClass.reconstitute({
                publicId,
                title,
                description,
                category,
                status,
                ownerId,
                archivedAt: raw.archived_at ? DateVo.create(raw.archived_at) : null,
                completedAt: raw.completed_at ? DateVo.create(raw.completed_at) : null
            }, id, createdAt, updatedAt, ownerPublicId)

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'ProjectMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    project: raw.id
                }
            )
        }
    }

    static toPersistence(project: ProjectEntityClass): Prisma.ProjectCreateInput {

        try {
            // USE PRIMITIVES RAW DATA INTO DB
            const projectPrimitives = project.toPrimitives()

            const prismaCategory = this.DOMAIN_TO_PRISMA_CATEGORY[projectPrimitives.category];

            if (!prismaCategory) {
                throw new Error(`[ProjectMapper] No se pudo mapear la categoría de dominio: ${projectPrimitives.category} a un enum válido de Prisma.`);
            }

            return {
                id: projectPrimitives.id,
                public_id: projectPrimitives.publicId,
                title: projectPrimitives.title,
                description: projectPrimitives.description,
                category: prismaCategory,
                status: projectPrimitives.status as ProjectStatus,
                owner: { connect: { id: projectPrimitives.ownerId } },
                completed_at: projectPrimitives.completedAt ?? null,
                archived_at: projectPrimitives.archivedAt ?? null,
            }

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'ProjectMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    project: project.id.value
                }
            )
        }
    }


    public static readonly DOMAIN_TO_PRISMA_CATEGORY = {
        'DEVELOPMENT/ENGINEERING': 'DEVELOPMENT_ENGINEERING',
        'DESIGN/UX': 'DESIGN_UX',
        'MAINTENANCE/SUPPORT': 'MAINTENANCE_SUPPORT',
        'INFRASTRUCTURE/DEVOPS': 'INFRASTRUCTURE_DEVOPS',
        'DATA/ANALYSIS': 'DATA_ANALYSIS',
        'MARKETING/SALES': 'MARKETING_SALES',
    } satisfies Record<ProjectCategoryOptions, PrismaCategory>;


    private static readonly PRISMA_TO_DOMAIN_CATEGORY = {
        DEVELOPMENT_ENGINEERING: 'DEVELOPMENT/ENGINEERING',
        DESIGN_UX: 'DESIGN/UX',
        MAINTENANCE_SUPPORT: 'MAINTENANCE/SUPPORT',
        INFRASTRUCTURE_DEVOPS: 'INFRASTRUCTURE/DEVOPS',
        DATA_ANALYSIS: 'DATA/ANALYSIS',
        MARKETING_SALES: 'MARKETING/SALES',
    } satisfies Record<PrismaCategory, ProjectCategoryOptions>;

}