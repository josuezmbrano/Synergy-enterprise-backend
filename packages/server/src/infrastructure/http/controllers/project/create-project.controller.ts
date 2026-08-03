import { CreateProjectBodySchema, CreateProjectInput } from '@project/common/schemas/project.schema.js';
import { CreateProjectCase } from 'application/use-cases/project/create-project.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import z from 'zod';



type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>

export class CreateProjectController {
    constructor(private readonly createProjectUseCase: CreateProjectCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Destructure the Zod-validated body properties
            const { category, description, title } = req.body as CreateProjectBody

            const input: CreateProjectInput = {
                actorId,
                category,
                description,
                title
            }

            const result = await this.createProjectUseCase.execute(input)

            res.status(201).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}