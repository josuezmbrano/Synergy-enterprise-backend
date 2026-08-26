import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { FindUserBodySchema, UpdateEmailBodySchema, UpdatePasswordBodySchema, UpdateProfileBodySchema } from '@project/common/schemas/user.schema.js';
import { UserModules } from 'infrastructure/container/di/user-modules.di.js';
import { MiddlewareModules } from 'infrastructure/container/di.config.js';


export const createUserRouter = (modules: UserModules, middlewares: MiddlewareModules): Router => {
    const userRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares

    // PROTECT ALL PRIVATE USER ROUTES WITH THE AUTH MIDDLEWARE
    userRouter.use(checkAuth.execute)


    // PRIVATE ROUTES

    // User collection management
    userRouter.get('/find-user', validateRequest(FindUserBodySchema), controllers.findUserController.execute)
    // Specific property modifications
    userRouter.patch('/update-email', validateRequest(UpdateEmailBodySchema), controllers.updateEmailController.execute)
    userRouter.patch('/update-password', validateRequest(UpdatePasswordBodySchema), controllers.updatePasswordController.execute)
    userRouter.patch('/update-profile', validateRequest(UpdateProfileBodySchema), controllers.updateProfileController.execute)

    return userRouter
}







