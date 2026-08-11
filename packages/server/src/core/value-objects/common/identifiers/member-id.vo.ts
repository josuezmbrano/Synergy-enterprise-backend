import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'


export class MemberIdVo extends UniqueIdentifier<'MemberIdVo'> {

    protected readonly identifierType = 'MemberIdVo' as const;

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): MemberIdVo {
        return new MemberIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): MemberIdVo {
        return new MemberIdVo(id)
    }

}