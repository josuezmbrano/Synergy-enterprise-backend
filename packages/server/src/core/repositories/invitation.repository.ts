import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { IBaseRepository } from './base.repository.js';
import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';

export interface IInvitationRepository extends IBaseRepository<InvitationIdVo, InvitationEntityClass> {
    findAllInvitationsByUser(internalUserId: UserIdVo): Promise<InvitationEntityClass[]>
}