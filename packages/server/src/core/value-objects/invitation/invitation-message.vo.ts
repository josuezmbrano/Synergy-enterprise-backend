import { INVITATION_CONSTRAINTS } from '@project/common/constants/invitation.constants.js';
import { BaseValueObject } from '../base.value-objects.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';

export class InvitationMessageVo extends BaseValueObject<string> {

    public readonly voType = 'InvitationMessageVo';

    private constructor(value: string) {
        super(value)
    }

    public static create(message?: string): InvitationMessageVo {

        const sanitizedMessage = (message ?? '').trim()

        if (sanitizedMessage.length > INVITATION_CONSTRAINTS.MESSAGE_MAX_LENGTH) {
            throw InvitationErrorFactory.invitationValidationFailed({
                field: 'message',
                receivedValue: sanitizedMessage,
                reason: 'LENGTH_MISMATCH',
                constraint: `max_length: ${INVITATION_CONSTRAINTS.MESSAGE_MAX_LENGTH}`,
                description: `Invitation message character limit cannot exceed ${INVITATION_CONSTRAINTS.MESSAGE_MAX_LENGTH}`
            })
        }

        if (!INVITATION_CONSTRAINTS.MESSAGE_REGEX_FORMAT.test(sanitizedMessage)) {
            throw InvitationErrorFactory.invitationValidationFailed({
                field: 'message',
                receivedValue: sanitizedMessage,
                reason: 'INVALID_CHARACTERS',
                constraint: 'angle brackets are not allowed',
                description: 'Invitation messages cannot contain angle brackets (< or >). Please use standard text, emojis, and line breaks.'
            })
        }

        return new InvitationMessageVo(sanitizedMessage)
    }
}