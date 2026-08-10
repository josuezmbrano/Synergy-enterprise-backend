import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js';

export class InvitationIdVo extends UniqueIdentifier {

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): InvitationIdVo {
        return new InvitationIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): InvitationIdVo {
        return new InvitationIdVo(id)
    }
    
}