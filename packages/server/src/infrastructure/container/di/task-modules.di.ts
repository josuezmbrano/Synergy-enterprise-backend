import { containerDI } from '../di.config.js';

// USE CASE IMPORTS
import { CreateTaskCase } from 'application/use-cases/task/create-task.usecase.js';
import { FindAllTasksCase } from 'application/use-cases/task/find-all-tasks.usecase.js';
import { FindTaskCase } from 'application/use-cases/task/find-task.usecase.js';
import { UpdateTaskDuedateCase } from 'application/use-cases/task/update-task-duedate.usecase.js';
import { UpdateTaskInfoCase } from 'application/use-cases/task/update-task-info.usecase.js';
import { SetDoingStatusCase } from 'application/use-cases/task/status/set-doing-status.usecase.js';
import { SetCompletedStatusCase } from 'application/use-cases/task/status/set-completed-status.usecase.js';
import { SetReviewStatusCase } from 'application/use-cases/task/status/set-review-status.usecase.js';
import { SetLowPriorityCase } from 'application/use-cases/task/priority/set-low-priority.usecase.js';
import { SetMediumPriorityCase } from 'application/use-cases/task/priority/set-medium-priority.usecase.js';
import { SetHighPriorityCase } from 'application/use-cases/task/priority/set-high-priority.usecase.js';
import { SetCriticalPriorityCase } from 'application/use-cases/task/priority/set-critical-priority.usecase.js';
import { RemoveAssigneeCase } from 'application/use-cases/task/assignee/remove-assignee.usecase.js';
import { UpdateAssigneeCase } from 'application/use-cases/task/assignee/update-assignee.usecase.js';

// CONTROLLER IMPORTS
import { CreateTaskController } from 'infrastructure/http/controllers/task/create-task.controller.js';
import { FindAllTasksController } from 'infrastructure/http/controllers/task/find-all-tasks.controller.js';
import { FindTaskController } from 'infrastructure/http/controllers/task/find-task.controller.js';
import { RemoveAssigneeController } from 'infrastructure/http/controllers/task/remove-assignee.controller.js';
import { UpdateAssigneeController } from 'infrastructure/http/controllers/task/update-assignee.controller.js';
import { SetCompletedTaskStatusController } from 'infrastructure/http/controllers/task/set-completed-status.controller.js';
import { SetDoingTaskStatusController } from 'infrastructure/http/controllers/task/set-doing-status.controller.js';
import { SetCriticalPriorityController } from 'infrastructure/http/controllers/task/set-critical-priority.controller.js';
import { SetHighPriorityController } from 'infrastructure/http/controllers/task/set-high-priority.controller.js';
import { SetLowPriorityController } from 'infrastructure/http/controllers/task/set-low-priority.controller.js';
import { SetMediumPriorityController } from 'infrastructure/http/controllers/task/set-medium-priority.controller.js';
import { UpdateTaskDuedateController } from 'infrastructure/http/controllers/task/update-task-duedate.controller.js';
import { UpdateTaskInfoController } from 'infrastructure/http/controllers/task/update-task-info.controller.js';
import { SetReviewTaskStatusController } from 'infrastructure/http/controllers/task/set-review-status.controller.js';


// USE CASES INSTANTIATION
const createTaskUseCase = new CreateTaskCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const findAllTasksUseCase = new FindAllTasksCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const findTaskUseCase = new FindTaskCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const updateTaskDuedateUseCase = new UpdateTaskDuedateCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const updateTaskInfoUseCase = new UpdateTaskInfoCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const setDoingStatusUseCase = new SetDoingStatusCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const setCompletedStatusUseCase = new SetCompletedStatusCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const setReviewStatusUseCase = new SetReviewStatusCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)
const setLowPriorityUseCase = new SetLowPriorityCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const setMediumPriorityUseCase = new SetMediumPriorityCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const setHighPriorityUseCase = new SetHighPriorityCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const setCriticalPriorityUseCase = new SetCriticalPriorityCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const removeAssigneeUseCase = new RemoveAssigneeCase(containerDI.repositories.taskRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository)
const updateAssigneeUseCase = new UpdateAssigneeCase(containerDI.repositories.taskRepository, containerDI.repositories.projectRepository, containerDI.repositories.userRepository, containerDI.repositories.memberRepository)

// CONTROLLERS INSTANTIATION
const createTaskController = new CreateTaskController(createTaskUseCase)
const findAllTasksController = new FindAllTasksController(findAllTasksUseCase)
const findTaskController = new FindTaskController(findTaskUseCase)
const updateTaskDuedateController = new UpdateTaskDuedateController(updateTaskDuedateUseCase)
const updateTaskInfoController = new UpdateTaskInfoController(updateTaskInfoUseCase)
const setDoingTaskStatusController = new SetDoingTaskStatusController(setDoingStatusUseCase)
const setCompletedTaskStatusController = new SetCompletedTaskStatusController(setCompletedStatusUseCase)
const setReviewTaskStatusController = new SetReviewTaskStatusController(setReviewStatusUseCase)
const setLowPriorityController = new SetLowPriorityController(setLowPriorityUseCase)
const setMediumPriorityController = new SetMediumPriorityController(setMediumPriorityUseCase)
const setHighPriorityController = new SetHighPriorityController(setHighPriorityUseCase)
const setCriticalPriorityController = new SetCriticalPriorityController(setCriticalPriorityUseCase)
const removeAssigneeController = new RemoveAssigneeController(removeAssigneeUseCase)
const updateAssigneeController = new UpdateAssigneeController(updateAssigneeUseCase)




export const taskModulesContainer = {
    useCases: {
        createTaskUseCase,
        findAllTasksUseCase,
        findTaskUseCase,
        updateTaskDuedateUseCase,
        updateTaskInfoUseCase,
        setDoingStatusUseCase,
        setCompletedStatusUseCase,
        setReviewStatusUseCase,
        setLowPriorityUseCase,
        setMediumPriorityUseCase,
        setHighPriorityUseCase,
        setCriticalPriorityUseCase,
        removeAssigneeUseCase,
        updateAssigneeUseCase
    },

    controllers: {
        createTaskController,
        findAllTasksController,
        findTaskController,
        updateTaskDuedateController,
        updateTaskInfoController,
        setDoingTaskStatusController,
        setCompletedTaskStatusController,
        setReviewTaskStatusController,
        setLowPriorityController,
        setMediumPriorityController,
        setHighPriorityController,
        setCriticalPriorityController,
        removeAssigneeController,
        updateAssigneeController
    }
} as const