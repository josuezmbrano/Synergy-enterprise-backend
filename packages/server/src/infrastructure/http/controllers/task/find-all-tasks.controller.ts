import { FindAllTasksInput } from '@project/common/schemas/task.schema.js';
import { FindAllTasksCase } from 'application/use-cases/task/find-all-tasks.usecase.js';
import type { Request, Response, NextFunction } from 'express';


export class FindAllTasksController {
    constructor(private readonly findAllTasksUseCase: FindAllTasksCase) {}

    execute = async(req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            const input: FindAllTasksInput = {
                actorId,
                projectId
            }

            const result = await this.findAllTasksUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next (error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}