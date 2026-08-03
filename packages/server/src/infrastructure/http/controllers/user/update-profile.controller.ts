import { UpdateProfileBodySchema, UpdateUserProfileInput } from '@project/common/schemas/user.schema.js';
import { UpdateProfileCase } from 'application/use-cases/user/update-profile.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import z from 'zod';


type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>

export class UpdateProfileController {
    constructor(private readonly updateProfileUseCase: UpdateProfileCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover the actor id from the auth payload
            const actorId = req.user.sub

            // Destructure the Zod-validated request body properties
            const { lastname, name, username } = req.body as UpdateProfileBody

            const input: UpdateUserProfileInput = {
                actorId,
                lastname,
                name,
                username
            }

            const result = await this.updateProfileUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}