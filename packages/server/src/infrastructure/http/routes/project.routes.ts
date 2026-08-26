import { Router } from 'express';
import { ProjectModules } from 'infrastructure/container/di/project-modules.di.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { CreateProjectBodySchema, UpdateProjectInfoBodySchema } from '@project/common/schemas/project.schema.js';
import { MiddlewareModules } from 'infrastructure/container/di.config.js';


export const createProjectRouter = (modules: ProjectModules, middlewares: MiddlewareModules): Router => {
    const projectRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares

    // PROTECT ALL PRIVATE PROJECT ROUTES WITH THE AUTH MIDDLEWARE
    projectRouter.use(checkAuth.execute)


    // PRIVATE ROUTES

    // Project collection management
    projectRouter.post('/', validateRequest(CreateProjectBodySchema), controllers.createProjectController.execute)
    projectRouter.get('/', controllers.findAllProjectsController.execute)
    projectRouter.get('/:projectId', controllers.findProjectController.execute)
    // Specific property modifications
    projectRouter.patch('/:projectId', validateRequest(UpdateProjectInfoBodySchema), controllers.updateProjectInfoController.execute)
    // State transitions
    projectRouter.patch('/:projectId/start', controllers.startProjectController.execute)
    projectRouter.patch('/:projectId/complete', controllers.completeProjectController.execute)
    projectRouter.patch('/:projectId/archive', controllers.archiveProjectController.execute)
    projectRouter.patch('/:projectId/unarchive', controllers.unarchiveProjectController.execute)

    return projectRouter
}






