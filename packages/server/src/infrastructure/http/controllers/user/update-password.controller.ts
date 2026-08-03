import { UpdatePasswordBodySchema, UpdateUserPasswordInput } from '@project/common/schemas/user.schema.js';
import { UpdatePasswordCase } from 'application/use-cases/user/update-password.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import z from 'zod';


type UpdatePasswordBody = z.infer<typeof UpdatePasswordBodySchema>

export class UpdatePasswordController {
    constructor(private readonly updatePasswordUseCase: UpdatePasswordCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover the actor id from the auth payload
            const actorId = req.user.sub

            // Destructure the Zod-validated request body properties
            const { newPassword, oldPassword } = req.body as UpdatePasswordBody

            const input: UpdateUserPasswordInput = {
                actorId,
                newPassword,
                oldPassword
            }

            const result = await this.updatePasswordUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}