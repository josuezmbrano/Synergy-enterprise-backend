import { containerDI } from '../di.config.js';

// USE CASE IMPORTS
import { CreateProjectCase } from 'application/use-cases/project/create-project.usecase.js';
import { FindAllProjectsCase } from 'application/use-cases/project/find-all-projects.usecase.js';
import { FindProjectCase } from 'application/use-cases/project/find-project.usecase.js';
import { UnarchiveProjectCase } from 'application/use-cases/project/unarchive-project.usecase.js';
import { UpdateProjectInfoCase } from 'application/use-cases/project/update-project-info.usecase.js';
import { ArchiveProjectCase } from 'application/use-cases/project/status-usecases/archive-project.usecase.js';
import { CompleteProjectCase } from 'application/use-cases/project/status-usecases/complete-project.usecase.js';
import { StartProjectCase } from 'application/use-cases/project/status-usecases/start-project.usecase.js';

// CONTROLLER IMPORTS
import { CreateProjectController } from 'infrastructure/http/controllers/project/create-project.controller.js';
import { FindAllProjectsController } from 'infrastructure/http/controllers/project/find-all-projects.controller.js';
import { FindProjectController } from 'infrastructure/http/controllers/project/find-project.controller.js';
import { StartProjectController } from 'infrastructure/http/controllers/project/start-project.controller.js';
import { UnarchiveProjectController } from 'infrastructure/http/controllers/project/unarchive-project.controller.js';
import { UpdateProjectInfoController } from 'infrastructure/http/controllers/project/update-project-info.controller.js';
import { ArchiveProjectController } from 'infrastructure/http/controllers/project/archive-project.controller.js';
import { CompleteProjectController } from 'infrastructure/http/controllers/project/complete-project.controller.js';


// USE CASES INSTANTIATION
const createProjectUseCase = new CreateProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.transactionalCoordinator.unitOfWork)
const findAllProjectsUseCase = new FindAllProjectsCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const findProjectUseCase = new FindProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.memberRepository, containerDI.repositories.userRepository)
const unarchiveProjectUseCase = new UnarchiveProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const updateProjectInfoUseCase = new UpdateProjectInfoCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const archiveProjectUseCase = new ArchiveProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const completeProjectUseCase = new CompleteProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.taskRepository, containerDI.repositories.memberRepository)
const startProjectUseCase = new StartProjectCase(containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.taskRepository, containerDI.repositories.memberRepository)

// CONTROLLERS INSTANTIATION
const createProjectController = new CreateProjectController(createProjectUseCase)
const findAllProjectsController = new FindAllProjectsController(findAllProjectsUseCase)
const findProjectController = new FindProjectController(findProjectUseCase)
const unarchiveProjectController = new UnarchiveProjectController(unarchiveProjectUseCase)
const updateProjectInfoController = new UpdateProjectInfoController(updateProjectInfoUseCase)
const archiveProjectController = new ArchiveProjectController(archiveProjectUseCase)
const completeProjectController = new CompleteProjectController(completeProjectUseCase)
const startProjectController = new StartProjectController(startProjectUseCase)




export const projectModulesContainer = {
    useCases: {
        createProjectUseCase,
        findAllProjectsUseCase,
        findProjectUseCase,
        unarchiveProjectUseCase,
        updateProjectInfoUseCase,
        archiveProjectUseCase,
        completeProjectUseCase,
        startProjectUseCase
    },

    controllers: {
        createProjectController,
        findAllProjectsController,
        findProjectController,
        unarchiveProjectController,
        updateProjectInfoController,
        archiveProjectController,
        completeProjectController,
        startProjectController
    }
} as const