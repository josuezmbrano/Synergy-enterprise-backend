import { ResendEmailVerificationCase } from 'application/use-cases/user/resend-email-verification.usecase.js';
import type { Request, Response, NextFunction } from 'express';

export class ResendEmailVerificationController {
    constructor(private readonly resendEmailVerificationUseCase: ResendEmailVerificationCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // RECOVER ACTING USER ID FROM JWT AUTH TOKEN PAYLOAD
            const userId = req.user.sub

            const result = await this.resendEmailVerificationUseCase.execute({ userId })

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }
    
}