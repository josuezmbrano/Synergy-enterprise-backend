import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { CreateTaskBodySchema, RemoveTaskAssigneeBodySchema, UpdateTaskAssigneeBodySchema, UpdateTaskDueDateBodySchema, UpdateTaskInfoBodySchema } from '@project/common/schemas/task.schema.js';
import { TaskModules } from 'infrastructure/container/di/task-modules.di.js';
import { MiddlewareModules } from 'infrastructure/container/di.config.js';

export const createTaskRouter = (modules: TaskModules, middlewares: MiddlewareModules): Router => {
    const taskRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares


    // PROTECT ALL PRIVATE PROJECT ROUTES WITH THE AUTH MIDDLEWARE
    taskRouter.use(checkAuth.execute)

    // PRIVATE ROUTES

    // Task collection management
    taskRouter.post('/:projectId/tasks', validateRequest(CreateTaskBodySchema), controllers.createTaskController.execute)
    taskRouter.get('/:projectId/tasks', controllers.findAllTasksController.execute)
    taskRouter.get('/:projectId/tasks/:taskId', controllers.findTaskController.execute)
    // Assignment management
    taskRouter.patch('/:projectId/tasks/:taskId/unassign', validateRequest(RemoveTaskAssigneeBodySchema), controllers.removeAssigneeController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/assign', validateRequest(UpdateTaskAssigneeBodySchema), controllers.updateAssigneeController.execute)
    // State transitions
    taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/completed', controllers.setCompletedTaskStatusController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/doing', controllers.setDoingTaskStatusController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/review', controllers.setReviewTaskStatusController.execute)
    // Priority updates
    taskRouter.patch('/:projectId/tasks/:taskId/critical', controllers.setCriticalPriorityController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/high', controllers.setHighPriorityController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/medium', controllers.setMediumPriorityController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/low', controllers.setLowPriorityController.execute)
    // Specific property modifications
    taskRouter.patch('/:projectId/tasks/:taskId/update-duedate', validateRequest(UpdateTaskDueDateBodySchema), controllers.updateTaskDuedateController.execute)
    taskRouter.patch('/:projectId/tasks/:taskId/update-info', validateRequest(UpdateTaskInfoBodySchema), controllers.updateTaskInfoController.execute)

    return taskRouter
}








