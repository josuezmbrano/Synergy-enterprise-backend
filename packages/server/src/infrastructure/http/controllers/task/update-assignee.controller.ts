import { UpdateTaskAssigneeBodySchema, UpdateTaskAssigneeInput } from '@project/common/schemas/task.schema.js';
import { UpdateAssigneeCase } from 'application/use-cases/task/assignee/update-assignee.usecase.js'
import type { Request, Response, NextFunction } from 'express';
import z from 'zod';


type UpdateAssigneeBody = z.infer<typeof UpdateTaskAssigneeBodySchema>

export class UpdateAssigneeController {
    constructor(private readonly updateAssigneeUseCase: UpdateAssigneeCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            // Retrieve the Zod-validated request body properties
            const { assigneeId } = req.body as UpdateAssigneeBody

            const input: UpdateTaskAssigneeInput = {
                actorId,
                taskId,
                assigneeId
            }

            const result = await this.updateAssigneeUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }

    }
}