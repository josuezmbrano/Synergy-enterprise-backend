import { Router } from 'express';
import type { Router as RouterType } from 'express-serve-static-core';
import { containerDI } from 'infrastructure/container/di.config.js';
import { projectModulesContainer } from 'infrastructure/container/di/project-modules.di.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { CreateProjectBodySchema, UpdateProjectInfoBodySchema } from '@project/common/schemas/project.schema.js';

export const projectRouter: RouterType = Router()

// Destructured controllers from the DI project module container
const {
    archiveProjectController,
    completeProjectController,
    createProjectController,
    findAllProjectsController,
    findProjectController,
    startProjectController,
    unarchiveProjectController,
    updateProjectInfoController
} = projectModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PROTECT ALL PRIVATE PROJECT ROUTES WITH THE AUTH MIDDLEWARE
projectRouter.use(checkAuth.execute)


// PRIVATE ROUTES

// Project collection management
projectRouter.post('/', validateRequest(CreateProjectBodySchema), createProjectController.execute)
projectRouter.get('/', findAllProjectsController.execute)
projectRouter.get('/:projectId', findProjectController.execute)
// Specific property modifications
projectRouter.patch('/:projectId', validateRequest(UpdateProjectInfoBodySchema), updateProjectInfoController.execute)
// State transitions
projectRouter.patch('/:projectId/start', startProjectController.execute)
projectRouter.patch('/:projectId/complete', completeProjectController.execute)
projectRouter.patch('/:projectId/archive', archiveProjectController.execute)
projectRouter.patch('/:projectId/unarchive', unarchiveProjectController.execute)
