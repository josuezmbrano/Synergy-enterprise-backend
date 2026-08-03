import { IAuthService } from 'core/services/auth-interface.service.js';
import type { Request, Response, NextFunction } from 'express-serve-static-core';


export class CheckAuthMiddleware {
    constructor(private readonly authService: IAuthService) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // RETRIVE THE TOKEN FROM THE HTTP ONLY COOKIES
            const token = req.cookies.token

            const decodedPayload = await this.authService.verifyToken(token)

            req.user = decodedPayload

            next()
        } catch (error) {

            next (error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}