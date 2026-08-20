import { containerDI } from '../di.config.js';

// USE CASE IMPORTS
import { LoginUserCase } from 'application/use-cases/user/login-user.usecase.js';
import { RegisterUserCase } from 'application/use-cases/user/register-user.usecase.js';
import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js';
import { ResendEmailVerificationCase } from 'application/use-cases/user/resend-email-verification.usecase.js';
import { ResetPasswordCase } from 'application/use-cases/user/reset-password.usecase.js';
import { VerifyEmailCase } from 'application/use-cases/user/verify-email.usecase.js';

// CONTROLLER IMPORTS
import { LoginUserController } from 'infrastructure/http/controllers/auth/login.controller.js';
import { RegisterUserController } from 'infrastructure/http/controllers/auth/register.controller.js';
import { RequestPasswordResetController } from 'infrastructure/http/controllers/auth/request-password-reset.controller.js';
import { ResendEmailVerificationController } from 'infrastructure/http/controllers/auth/resend-email-verification.controller.js';
import { ResetPasswordController } from 'infrastructure/http/controllers/auth/reset-password.controller.js';
import { VerifyEmailController } from 'infrastructure/http/controllers/auth/verify-email.controller.js';



// USE CASES INSTANTIATION
const loginUserUseCase = new LoginUserCase(containerDI.repositories.userRepository, containerDI.services.bcryptPasswordHasher, containerDI.services.jwtAuthService)
const registerUserUseCase = new RegisterUserCase(containerDI.repositories.userRepository, containerDI.services.bcryptPasswordHasher, containerDI.services.jwtAuthService, containerDI.repositories.verificationTokenRepository, containerDI.services.mailService, containerDI.transactionalCoordinator.unitOfWork, containerDI.loggerMonitorInstance.pinoLogger)
const requestPasswordResetUseCase = new RequestPasswordResetCase(containerDI.repositories.userRepository, containerDI.repositories.verificationTokenRepository, containerDI.services.mailService, containerDI.transactionalCoordinator.unitOfWork, containerDI.loggerMonitorInstance.pinoLogger)
const resendEmailVerificationUseCase = new ResendEmailVerificationCase(containerDI.repositories.userRepository, containerDI.repositories.verificationTokenRepository, containerDI.services.mailService, containerDI.transactionalCoordinator.unitOfWork, containerDI.loggerMonitorInstance.pinoLogger)
const resetPasswordUseCase = new ResetPasswordCase(containerDI.repositories.verificationTokenRepository, containerDI.repositories.userRepository, containerDI.services.bcryptPasswordHasher, containerDI.transactionalCoordinator.unitOfWork)
const verifyEmailUseCase = new VerifyEmailCase(containerDI.repositories.verificationTokenRepository, containerDI.repositories.userRepository, containerDI.transactionalCoordinator.unitOfWork)

// CONTROLLERS INSTANTIATION
const loginUserController = new LoginUserController(loginUserUseCase)
const registerUserController = new RegisterUserController(registerUserUseCase)
const requestPasswordResetController = new RequestPasswordResetController(requestPasswordResetUseCase)
const resendEmailVerificationController = new ResendEmailVerificationController(resendEmailVerificationUseCase)
const resetPasswordController = new ResetPasswordController(resetPasswordUseCase)
const verifyEmailController = new VerifyEmailController(verifyEmailUseCase)



export const authModulesContainer = {
    useCases: {
        loginUserUseCase,
        registerUserUseCase,
        requestPasswordResetUseCase,
        resendEmailVerificationUseCase,
        resetPasswordUseCase,
        verifyEmailUseCase
    },

    controllers: {
        loginUserController,
        registerUserController,
        requestPasswordResetController,
        resendEmailVerificationController,
        resetPasswordController,
        verifyEmailController
    }
} as const