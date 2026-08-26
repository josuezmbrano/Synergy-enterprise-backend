import { LoginUserInput } from '@project/common/schemas/user.schema.js';
import { LoginUserCase } from 'application/use-cases/user/login-user.usecase.js';
import type { Request, Response, NextFunction } from 'express'
import { CookieOptionsConfig } from 'infrastructure/config/modules/cookie.config.js';



export class LoginUserController {
    constructor(
        private readonly loginUserUseCase: LoginUserCase,
        private readonly cookieConfig: CookieOptionsConfig
    ) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // ASSIGN VALIDATED FIELDS FROM ZOD
            const input = req.body as LoginUserInput

            const { token: jwtToken, user } = await this.loginUserUseCase.execute(input)


            // Retrieve config and set http only cookies configuration
            res.cookie('token', jwtToken, this.cookieConfig)

            res.status(200).json({
                status: 'success',
                data: user
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}