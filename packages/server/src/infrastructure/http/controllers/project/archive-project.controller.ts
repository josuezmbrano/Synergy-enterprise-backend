import { ArchiveProjectInput } from '@project/common/schemas/project.schema.js';
import { ArchiveProjectCase } from 'application/use-cases/project/status-usecases/archive-project.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';


export class ArchiveProjectController {
    constructor(private readonly archiveProjectUseCase: ArchiveProjectCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            const input: ArchiveProjectInput = {
                actorId,
                projectId
            }

            const result = await this.archiveProjectUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}