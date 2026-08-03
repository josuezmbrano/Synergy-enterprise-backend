import { ResetPasswordInput } from '@project/common/schemas/user.schema.js';
import { ResetPasswordCase } from 'application/use-cases/user/reset-password.usecase.js';
import type { Request, Response, NextFunction } from 'express';

export class ResetPasswordController {
    constructor(private readonly resetPasswordUseCase: ResetPasswordCase) {}

    execute = async (req: Request, res: Response, next: NextFunction ): Promise<void> => {

        try {

            // ASSIGN VALIDATED FIELDS FROM ZOD
            const input = req.body as ResetPasswordInput

            const result = await this.resetPasswordUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}