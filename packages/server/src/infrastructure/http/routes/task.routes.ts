import { Router } from 'express';
import { containerDI } from 'infrastructure/container/di.config.js';
import { taskModulesContainer } from 'infrastructure/container/di/task-modules.di.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { CreateTaskBodySchema, RemoveTaskAssigneeBodySchema, UpdateTaskAssigneeBodySchema, UpdateTaskDueDateBodySchema, UpdateTaskInfoBodySchema } from '@project/common/schemas/task.schema.js';
import type { Router as RouterType } from 'express';

export const taskRouter: RouterType = Router()

// Destructured controllers from the DI task module container
const {
    createTaskController,
    findAllTasksController,
    findTaskController,
    removeAssigneeController,
    setCompletedTaskStatusController,
    setCriticalPriorityController,
    setDoingTaskStatusController,
    setHighPriorityController,
    setLowPriorityController,
    setMediumPriorityController,
    setReviewTaskStatusController,
    updateAssigneeController,
    updateTaskDuedateController,
    updateTaskInfoController
} = taskModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PROTECT ALL PRIVATE PROJECT ROUTES WITH THE AUTH MIDDLEWARE
taskRouter.use(checkAuth.execute)


// PRIVATE ROUTES

// Task collection management
taskRouter.post('/:projectId/tasks', validateRequest(CreateTaskBodySchema), createTaskController.execute)
taskRouter.get('/:projectId/tasks', findAllTasksController.execute)
taskRouter.get('/:projectId/tasks/:taskId', findTaskController.execute)
// Assignment management
taskRouter.patch('/:projectId/tasks/:taskId/unassign', validateRequest(RemoveTaskAssigneeBodySchema) ,removeAssigneeController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/assign', validateRequest(UpdateTaskAssigneeBodySchema) ,updateAssigneeController.execute)
// State transitions
taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/completed', setCompletedTaskStatusController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/doing', setDoingTaskStatusController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/members/:targetMemberId/review', setReviewTaskStatusController.execute)
// Priority updates
taskRouter.patch('/:projectId/tasks/:taskId/critical', setCriticalPriorityController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/high', setHighPriorityController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/medium', setMediumPriorityController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/low', setLowPriorityController.execute)
// Specific property modifications
taskRouter.patch('/:projectId/tasks/:taskId/update-duedate', validateRequest(UpdateTaskDueDateBodySchema), updateTaskDuedateController.execute)
taskRouter.patch('/:projectId/tasks/:taskId/update-info', validateRequest(UpdateTaskInfoBodySchema), updateTaskInfoController.execute)
