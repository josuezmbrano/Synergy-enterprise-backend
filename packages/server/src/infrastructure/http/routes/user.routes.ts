import { Router } from 'express';
import { userModulesContainer } from 'infrastructure/container/di/user-modules.di.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { FindUserBodySchema, UpdateEmailBodySchema, UpdatePasswordBodySchema, UpdateProfileBodySchema } from '@project/common/schemas/user.schema.js';
import type { Router as RouterType } from 'express-serve-static-core';
import { containerDI } from 'infrastructure/container/di.config.js';


export const userRouter: RouterType = Router()

// Destructured controllers from the DI container
const {
    findUserController,
    updateEmailController,
    updatePasswordController,
    updateProfileController
} = userModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PROTECT ALL PRIVATE USER ROUTES WITH THE AUTH MIDDLEWARE
userRouter.use(checkAuth.execute)


// PRIVATE ROUTES

// User collection management
userRouter.get('/find-user', validateRequest(FindUserBodySchema), findUserController.execute)
// Specific property modifications
userRouter.patch('/update-email', validateRequest(UpdateEmailBodySchema), updateEmailController.execute)
userRouter.patch('/update-password', validateRequest(UpdatePasswordBodySchema), updatePasswordController.execute)
userRouter.patch('/update-profile', validateRequest(UpdateProfileBodySchema), updateProfileController.execute)