import { CreateTaskBodySchema, CreateTaskInput } from '@project/common/schemas/task.schema.js';
import { CreateTaskCase } from 'application/use-cases/task/create-task.usecase.js';
import type { Request, Response, NextFunction } from 'express';
import z from 'zod';


type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>

export class CreateTaskController {
    constructor(private readonly createTaskUseCase: CreateTaskCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the acting user id from the auth payload
            const actingUserId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            // Destructured the Zod-validated request body properties
            const { description, dueDate, objective, priority, assigneeMemberId } = req.body as CreateTaskBody

            const input: CreateTaskInput = {
                actingUserId,
                projectId,
                description,
                dueDate,
                objective,
                priority,
                assigneeMemberId
            }

            const result = await this.createTaskUseCase.execute(input)

            res.status(201).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}