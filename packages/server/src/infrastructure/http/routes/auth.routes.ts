import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { LoginUserSchema, RegisterUserSchema, RequestPasswordSchema, ResetPasswordSchema, VerifyEmailSchema } from '@project/common/schemas/user.schema.js';
import { AuthModules } from 'infrastructure/container/di/auth-modules.di.js';
import { MiddlewareModules } from 'infrastructure/container/di.config.js';


export const createAuthRouter = (modules: AuthModules, middlewares: MiddlewareModules): Router => {
    const authRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares

    // PUBLIC ROUTES   
    authRouter.post('/login', validateRequest(LoginUserSchema), controllers.loginUserController.execute)
    authRouter.post('/register', validateRequest(RegisterUserSchema), controllers.registerUserController.execute)
    authRouter.post('/request-password-reset', validateRequest(RequestPasswordSchema), controllers.requestPasswordResetController.execute)
    authRouter.post('/reset-password', validateRequest(ResetPasswordSchema), controllers.resetPasswordController.execute)
    authRouter.post('/verify-email', validateRequest(VerifyEmailSchema), controllers.verifyEmailController.execute)


    // PRIVATE ROUTES
    authRouter.post('/resend-email-verification', checkAuth.execute, controllers.resendEmailVerificationController.execute)

    return authRouter
}
