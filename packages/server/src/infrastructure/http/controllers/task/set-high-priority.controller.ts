import { SetHighPriorityInput } from '@project/common/schemas/task.schema.js'
import { SetHighPriorityCase } from 'application/use-cases/task/priority/set-high-priority.usecase.js'
import type { Request, Response, NextFunction } from 'express'


export class SetHighPriorityController {
    constructor(private readonly setHighPriorityUseCase: SetHighPriorityCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            const input: SetHighPriorityInput = {
                actorId,
                taskId
            }

            const result = await this.setHighPriorityUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}