import { RequestPasswordResetInput } from '@project/common/schemas/user.schema.js';
import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js';
import type { Request, Response, NextFunction } from 'express';

export class RequestPasswordResetController {
    constructor(private readonly requestPasswordResetUseCase: RequestPasswordResetCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // ASSIGN VALIDATED FIELDS FROM ZOD
            const input = req.body as RequestPasswordResetInput

            const result = await this.requestPasswordResetUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {
            
            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}