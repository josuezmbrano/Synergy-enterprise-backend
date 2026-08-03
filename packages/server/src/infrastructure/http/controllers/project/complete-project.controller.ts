import { CompleteProjectInput } from '@project/common/schemas/project.schema.js'
import { CompleteProjectCase } from 'application/use-cases/project/status-usecases/complete-project.usecase.js'
import { NextFunction, Request, Response } from 'express-serve-static-core'

export class CompleteProjectController {
    constructor(private readonly completeProjectUseCase: CompleteProjectCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            const input: CompleteProjectInput = {
                actorId,
                projectId
            }

            const result = await this.completeProjectUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}