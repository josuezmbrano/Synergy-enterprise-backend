import { SetCompletedStatusInput } from '@project/common/schemas/task.schema.js'
import { SetCompletedStatusCase } from 'application/use-cases/task/status/set-completed-status.usecase.js'
import type { Request, Response, NextFunction } from 'express'

export class SetCompletedTaskStatusController {
    constructor(private readonly setCompletedTaskStatusUseCase: SetCompletedStatusCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the task id from the request parameters
            const taskId = req.params.taskId as string

            // Retrieve the member assigned id from the request parameters
            const targetMemberId = req.params.targetMemberId as string

            const input: SetCompletedStatusInput = {
                actorId,
                taskId,
                targetMemberId
            }

            const result = await this.setCompletedTaskStatusUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}