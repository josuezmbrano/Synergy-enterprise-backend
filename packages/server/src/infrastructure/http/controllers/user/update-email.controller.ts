import { UpdateEmailBodySchema, UpdateUserEmailInput } from '@project/common/schemas/user.schema.js';
import { UpdateEmailCase } from 'application/use-cases/user/update-email.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import { cookieConfig } from 'infrastructure/config/modules/cookie.config.js';
import z from 'zod';


type UpdateEmailBody = z.infer<typeof UpdateEmailBodySchema>

export class UpdateEmailController {
    constructor(private readonly updateEmailUseCase: UpdateEmailCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Destructure the Zod-validated request body properties
            const { currentPassword, newEmail } = req.body as UpdateEmailBody

            const input: UpdateUserEmailInput = {
                actorId,
                currentPassword,
                newEmail
            }

            const { token: jwtToken, user } = await this.updateEmailUseCase.execute(input)


            // Retrieve config and set http only cookies configuration
            
            res.cookie('token', jwtToken, cookieConfig)

            res.status(200).json({
                status: 'success',
                data: user
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}