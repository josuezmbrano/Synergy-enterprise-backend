import { FindAllProjectsCase } from 'application/use-cases/project/find-all-projects.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';


export class FindAllProjectsController {
    constructor(private readonly findAllProjectsUseCase: FindAllProjectsCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            const result = await this.findAllProjectsUseCase.execute({ actorId })

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}