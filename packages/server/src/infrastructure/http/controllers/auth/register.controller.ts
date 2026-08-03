import { RegisterUserInput } from '@project/common/schemas/user.schema.js';
import { RegisterUserCase } from 'application/use-cases/user/register-user.usecase.js';
import { NextFunction, Request, Response } from 'express';
import { getCookieConfig } from 'infrastructure/config/cookie.config.js';


export class RegisterUserController {
    constructor(private readonly registerUserUseCase: RegisterUserCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // ASSIGN VALIDATED FIELDS FROM ZOD
            const input = req.body as RegisterUserInput

            const { token: jwtToken, user } = await this.registerUserUseCase.execute(input)

            
            // Retrieve config and set http only cookies configuration
            const cookieOptions = getCookieConfig()
            res.cookie('token', jwtToken, cookieOptions)

            res.status(201).json({
                status: 'success',
                data: user
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}