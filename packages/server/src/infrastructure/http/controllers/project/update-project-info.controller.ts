import { UpdateProjectInfoBodySchema, UpdateProjectInfoInput } from '@project/common/schemas/project.schema.js';
import { UpdateProjectInfoCase } from 'application/use-cases/project/update-project-info.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import z from 'zod';


type UpdateProjectInfoBody = z.infer<typeof UpdateProjectInfoBodySchema>

export class UpdateProjectInfoController {
    constructor(private readonly updateProjectInfoUseCase: UpdateProjectInfoCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            // Retrieve the Zod-validated body properties
            const { description, title } = req.body as UpdateProjectInfoBody

            const input: UpdateProjectInfoInput = {
                actorId,
                projectId,
                description,
                title
            }

            const result = await this.updateProjectInfoUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}