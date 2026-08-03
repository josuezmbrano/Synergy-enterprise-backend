import { UpdateTaskDueDateBodySchema, UpdateTaskDueDateInput } from '@project/common/schemas/task.schema.js';
import { UpdateTaskDuedateCase } from 'application/use-cases/task/update-task-duedate.usecase.js';
import type { Request, Response, NextFunction } from 'express';
import z from 'zod';


type UpdateTaskDuedateBody = z.infer<typeof UpdateTaskDueDateBodySchema>

export class UpdateTaskDuedateController {
    constructor(private readonly updateTaskDuedateUseCase: UpdateTaskDuedateCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            // Destructured Zod-validated request body properties
            const { dueDate } = req.body as UpdateTaskDuedateBody

            const input: UpdateTaskDueDateInput = {
                actorId,
                taskId,
                dueDate
            }

            const result = await this.updateTaskDuedateUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}