import { RemoveTaskAssigneeBodySchema, RemoveTaskAssigneeInput } from '@project/common/schemas/task.schema.js';
import { RemoveAssigneeCase } from 'application/use-cases/task/assignee/remove-assignee.usecase.js';
import type { Request, Response, NextFunction } from 'express';
import z from 'zod';


type RemoveAssigneeBody = z.infer<typeof RemoveTaskAssigneeBodySchema>

export class RemoveAssigneeController {
    constructor(private readonly removeAssigneeUseCase: RemoveAssigneeCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            // Retrieve the Zod-validated request body properties
            const { targetMemberId } = req.body as RemoveAssigneeBody

            const input: RemoveTaskAssigneeInput = {
                actorId,
                taskId,
                targetMemberId
            }

            const result = await this.removeAssigneeUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }

    }
}