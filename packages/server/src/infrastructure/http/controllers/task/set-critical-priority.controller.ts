import { SetCriticalPriorityInput } from '@project/common/schemas/task.schema.js'
import { SetCriticalPriorityCase } from 'application/use-cases/task/priority/set-critical-priority.usecase.js'
import type { Request, Response, NextFunction } from 'express'


export class SetCriticalPriorityController {
    constructor(private readonly setCriticalPriorityUseCase: SetCriticalPriorityCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            const input: SetCriticalPriorityInput = {
                actorId,
                taskId
            }

            const result = await this.setCriticalPriorityUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}