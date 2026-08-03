import { VerifyUserEmailInput } from '@project/common/schemas/user.schema.js';
import { VerifyEmailCase } from 'application/use-cases/user/verify-email.usecase.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';

export class VerifyEmailController {
    constructor(private readonly verifyEmailUseCase: VerifyEmailCase) {}

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // ASSIGN VALIDATED FIELDS FROM ZOD
            const input = req.body as VerifyUserEmailInput

            const result = await this.verifyEmailUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}