import { ZodError, ZodType } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js'


// ZOD VALIDATOR THAT IMPLEMENTS A GENERIC T TYPE EXTENSION FROM ZODTYPE TO ONLY EXPECT ZOD SQUEMAS
export const validateRequest = <T extends ZodType>(validateSchema: T) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            // returns the exact type inferred from the schema
            const validatedBody = await validateSchema.parseAsync(req.body)

            // reassigned req.body that contains explicitly validatedBody
            req.body = validatedBody
            next()
        } catch (error) {

            if (error instanceof ZodError) {
                const validationErrorMessages = error.issues.map(issue => {
                    return `${issue.path.join('.')}: ${issue.message}`
                })
                return next(CommonErrorFactory.commonInvalidInputPayload({ messages: validationErrorMessages.join(' | ') }))
            }

            next(error)
        }
    }
}