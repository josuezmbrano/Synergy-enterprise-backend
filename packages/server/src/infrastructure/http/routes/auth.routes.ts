import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { LoginUserSchema, RegisterUserSchema, RequestPasswordSchema, ResetPasswordSchema, VerifyEmailSchema } from '@project/common/schemas/user.schema.js';
import { authModulesContainer } from 'infrastructure/container/di/auth-modules.di.js';
import type { Router as RouterType } from 'express-serve-static-core';
import { containerDI } from 'infrastructure/container/di.config.js';

export const authRouter: RouterType = Router()

// Destructured controllers from the DI auth module container
const {
    loginUserController,
    registerUserController,
    requestPasswordResetController,
    resendEmailVerificationController,
    resetPasswordController,
    verifyEmailController
} = authModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PUBLIC ROUTES   
authRouter.post('/login', validateRequest(LoginUserSchema), loginUserController.execute)
authRouter.post('/register', validateRequest(RegisterUserSchema), registerUserController.execute)
authRouter.post('/request-password-reset', validateRequest(RequestPasswordSchema), requestPasswordResetController.execute)
authRouter.post('/reset-password', validateRequest(ResetPasswordSchema), resetPasswordController.execute)
authRouter.post('/verify-email', validateRequest(VerifyEmailSchema), verifyEmailController.execute)


// PRIVATE ROUTES
authRouter.post('/resend-email-verification', checkAuth.execute, resendEmailVerificationController.execute)