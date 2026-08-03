import { GetInvitationOutput } from './get-invitation.dto.js';

export interface GetAllInvitationsOutput {
    invitations: Omit<GetInvitationOutput, 'metrics'>[]
}