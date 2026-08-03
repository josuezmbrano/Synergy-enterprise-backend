import { FindTaskInput } from '@project/common/schemas/task.schema.js'
import { FindTaskCase } from 'application/use-cases/task/find-task.usecase.js'
import type { Request, Response, NextFunction } from 'express'

export class FindTaskController {
    constructor(private readonly findTaskUseCase: FindTaskCase) {}

    execute = async(req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            const input: FindTaskInput = {
                actorId,
                taskId
            }

            const result = await this.findTaskUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next (error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}