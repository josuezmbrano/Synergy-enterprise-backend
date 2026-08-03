import { StartProjectInput } from '@project/common/schemas/project.schema.js'
import { StartProjectCase } from 'application/use-cases/project/status-usecases/start-project.usecase.js'
import { NextFunction, Request, Response } from 'express-serve-static-core'

export class StartProjectController {
    constructor(private readonly startProjectUseCase: StartProjectCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            const input: StartProjectInput = {
                actorId,
                projectId
            }

            const result = await this.startProjectUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}