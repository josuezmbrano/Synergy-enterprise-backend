import { UserErrorCodes } from '../code/user.codes.js';

export const UserRuleErrorMessages = {
    [UserErrorCodes.USER_NOT_VERIFIED]: 'Error: user is not verified, a verification process is still pending.', //USADO
    [UserErrorCodes.USER_USERNAME_CHANGE_LIMIT]: 'Error: Username change is limited to once per thirty days.',
    [UserErrorCodes.USER_EMAIL_REVERIFICATION_REQUIRED]: 'Error: An email change was detected. User must re-verify email to change its status to active.',
    [UserErrorCodes.USER_SUSPENDED_LOCKED]: 'Error: User account is suspended, cannot perform any actions until it is reestablished.', // USADO
    [UserErrorCodes.USER_NOT_ACTIVE_FOR_ACTION]: 'Error: Current account does not have the necessary permissions to perform operational actions, such as creating, modifying, or participating in projects.', // USADO
    [UserErrorCodes.USER_MAX_ADMIN_ROLES_REACHED]: 'Error: Max 5 concurrent admin roles per user.',
    [UserErrorCodes.USER_ALREADY_ACTIVE]: 'Error: User account is already active.',
    [UserErrorCodes.USER_PASSWORD_REUSE]: 'Error: The new password cannot be identical to the current password.',
} as const