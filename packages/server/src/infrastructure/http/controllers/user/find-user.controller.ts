import { FindUserBodySchema, FindUserInput } from '@project/common/schemas/user.schema.js';
import { FindUserCase } from 'application/use-cases/user/find-user.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import z from 'zod';


type FindUserBody = z.infer<typeof FindUserBodySchema>

export class FindUserController {
    constructor(private readonly findUserUseCase: FindUserCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Destructure validated zod body input
            const { query } = req.body as FindUserBody

            const input: FindUserInput = {
                actorId,
                query
            }

            const result = await this.findUserUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}