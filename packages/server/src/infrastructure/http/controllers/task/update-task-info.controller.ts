import { UpdateTaskInfoBodySchema, UpdateTaskInfoInput } from '@project/common/schemas/task.schema.js'
import { UpdateTaskInfoCase } from 'application/use-cases/task/update-task-info.usecase.js'
import z from 'zod'

import type { Request, Response, NextFunction } from 'express'

type UpdateTaskInfoBody = z.infer<typeof UpdateTaskInfoBodySchema>

export class UpdateTaskInfoController {
    constructor(private readonly updateTaskInfoUseCase: UpdateTaskInfoCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            // Destructured Zod-validated request body properties
            const { description, objective } = req.body as UpdateTaskInfoBody

            const input: UpdateTaskInfoInput = {
                actorId,
                taskId,
                description,
                objective
            }

            const result = await this.updateTaskInfoUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}