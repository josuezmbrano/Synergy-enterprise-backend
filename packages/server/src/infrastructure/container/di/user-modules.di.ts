import { ContainerBase } from '../di.base.js';

// USE CASE IMPORTS
import { FindUserCase } from 'application/use-cases/user/find-user.usecase.js';
import { UpdateEmailCase } from 'application/use-cases/user/update-email.usecase.js';
import { UpdatePasswordCase } from 'application/use-cases/user/update-password.usecase.js';
import { UpdateProfileCase } from 'application/use-cases/user/update-profile.usecase.js';
import { getCookieConfig } from 'infrastructure/config/modules/cookie.config.js';

// CONTROLLER IMPORTS
import { FindUserController } from 'infrastructure/http/controllers/user/find-user.controller.js';
import { UpdateEmailController } from 'infrastructure/http/controllers/user/update-email.controller.js';
import { UpdatePasswordController } from 'infrastructure/http/controllers/user/update-password.controller.js';
import { UpdateProfileController } from 'infrastructure/http/controllers/user/update-profile.controller.js';




export const createUserModules = (containerDI: ContainerBase) => {

    const cookieConfig = getCookieConfig(containerDI.environment.env)

    // USE CASES INSTANTIATION
    const findUserUseCase = new FindUserCase(containerDI.repositories.userRepository)
    const updateEmailUseCase = new UpdateEmailCase(containerDI.repositories.userRepository, containerDI.repositories.verificationTokenRepository, containerDI.services.bcryptPasswordHasher, containerDI.services.jwtAuthService, containerDI.eda.eventBus, containerDI.transactionalCoordinator.unitOfWork)
    const updatePasswordUseCase = new UpdatePasswordCase(containerDI.repositories.userRepository, containerDI.services.bcryptPasswordHasher)
    const updateProfileUseCase = new UpdateProfileCase(containerDI.repositories.userRepository)

    // CONTROLLERS INSTANTIATION
    const findUserController = new FindUserController(findUserUseCase)
    const updateEmailController = new UpdateEmailController(updateEmailUseCase, cookieConfig)
    const updatePasswordController = new UpdatePasswordController(updatePasswordUseCase)
    const updateProfileController = new UpdateProfileController(updateProfileUseCase)

    return {
        useCases: {
            findUserUseCase,
            updateEmailUseCase,
            updatePasswordUseCase,
            updateProfileUseCase
        },

        controllers: {
            findUserController,
            updateEmailController,
            updatePasswordController,
            updateProfileController
        }
    } as const
} 


export type UserModules = ReturnType<typeof createUserModules>