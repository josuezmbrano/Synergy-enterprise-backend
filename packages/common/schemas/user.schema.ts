import { z } from 'zod'
import { USER_CONSTRAINTS } from '../constants/user.constants.js'



const emailBase = z.email({ pattern: USER_CONSTRAINTS.EMAIL_REGEX_FORMAT, error: 'Email value should be in a valid format' })
    .nonempty({ error: 'Email input should not be empty' })
    .max(USER_CONSTRAINTS.EMAIL_MAX_LENGTH, { error: `Email cannot exceed ${USER_CONSTRAINTS.EMAIL_MAX_LENGTH} characters` })
    .trim()

const passwordBase = z.string()
    .min(USER_CONSTRAINTS.PASSWORD_MIN_LENGTH, { error: `Password must contain at least ${USER_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters` })
    .max(USER_CONSTRAINTS.PASSWORD_MAX_LENGTH, { error: `Password cannot exceed ${USER_CONSTRAINTS.PASSWORD_MAX_LENGTH} characters` })
    .regex(USER_CONSTRAINTS.PASSWORD_REGEX_FORMAT, { error: 'Password must contain at least one uppercase letter, one lowercase letter and one number' })
    .trim()

const usernameBase = z.string()
    .min(USER_CONSTRAINTS.USERNAME_MIN_LENGTH, { error: `Username must contain at least ${USER_CONSTRAINTS.USERNAME_MIN_LENGTH} characters` })
    .max(USER_CONSTRAINTS.USERNAME_MAX_LENGTH, { error: `Username cannot exceed ${USER_CONSTRAINTS.USERNAME_MAX_LENGTH} characters` })
    .regex(USER_CONSTRAINTS.USERNAME_REGEX_FORMAT, { error: 'Username only accepts alphanumeric characters and basic punctuation (., -, _)' })

const nameBase = z.string()
    .min(USER_CONSTRAINTS.NAME_MIN_LENGTH, { error: `Name must contain at least ${USER_CONSTRAINTS.NAME_MIN_LENGTH} characters` })
    .max(USER_CONSTRAINTS.NAME_MAX_LENGTH, { error: `Name cannot exceed ${USER_CONSTRAINTS.NAME_MAX_LENGTH} characters` })
    .regex(USER_CONSTRAINTS.NAME_REGEX_FORMAT, { error: 'Name only accepts letter characters (including accents), spaces, and (-)' })

const lastnameBase = z.string()
    .min(USER_CONSTRAINTS.LASTNAME_MIN_LENGTH, { error: `Lastname must contain at least ${USER_CONSTRAINTS.LASTNAME_MIN_LENGTH} characters` })
    .max(USER_CONSTRAINTS.LASTNAME_MAX_LENGTH, { error: `Lastname cannot exceed ${USER_CONSTRAINTS.LASTNAME_MAX_LENGTH} characters` })
    .regex(USER_CONSTRAINTS.LASTNAME_REGEX_FORMAT, { error: 'Lastname only accepts letter characters (including accents), spaces, and (-)' })




export const LoginUserSchema = z.object({

    email: emailBase,
    password: passwordBase
})
export type LoginUserInput = z.infer<typeof LoginUserSchema>



export const FindUserSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    query: z.string()
        .nonempty({ error: 'Search query cannot be empty ' })
        .max(USER_CONSTRAINTS.EMAIL_MAX_LENGTH, { error: 'Search query is too long' })
        .trim()
})
export type FindUserInput = z.infer<typeof FindUserSchema>
export const FindUserBodySchema = FindUserSchema.omit({ actorId: true })



export const RegisterUserSchema = z.object({

    username: usernameBase,
    name: nameBase,
    lastname: lastnameBase,
    email: emailBase,
    password: passwordBase
})
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>



export const RequestPasswordSchema = z.object({
    email: emailBase
})
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordSchema>



export const ResendEmailSchema = z.object({
    userId: z.uuidv4({ error: 'User identification must be a valid UUID' })
        .trim(),
})
export type ResendEmailVerificationInput = z.infer<typeof ResendEmailSchema>




export const ResendPasswordSchema = z.object({
    email: emailBase
})
export type ResendPasswordResetInput = z.infer<typeof ResendPasswordSchema>



export const ResetPasswordSchema = z.object({

    newPassword: passwordBase,
    token: z.uuidv4({ error: 'Token identification must be a valid UUID' })
        .trim()
})
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>



export const UpdateEmailSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    newEmail: emailBase,
    currentPassword: passwordBase
})
export type UpdateUserEmailInput = z.infer<typeof UpdateEmailSchema>
export const UpdateEmailBodySchema = UpdateEmailSchema.omit({ actorId: true })



export const UpdatePasswordSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    newPassword: passwordBase,
    oldPassword: passwordBase
})
export type UpdateUserPasswordInput = z.infer<typeof UpdatePasswordSchema>
export const UpdatePasswordBodySchema = UpdatePasswordSchema.omit({ actorId: true })



export const UpdateProfileSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    username: usernameBase.optional(),
    name: nameBase.optional(),
    lastname: lastnameBase.optional()
})
export type UpdateUserProfileInput = z.infer<typeof UpdateProfileSchema>
export const UpdateProfileBodySchema = UpdateProfileSchema.omit({ actorId: true })


export const VerifyEmailSchema = z.object({

    token: z.uuidv4({ error: 'Token identification must be a valid UUID' })
        .trim()
})
export type VerifyUserEmailInput = z.infer<typeof VerifyEmailSchema>