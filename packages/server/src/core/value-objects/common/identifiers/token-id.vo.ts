import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js';

export class TokenIdVo extends UniqueIdentifier<'TokenIdVo'> {

    protected readonly identifierType = 'TokenIdVo' as const;

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): TokenIdVo {
        return new TokenIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): TokenIdVo {
        return new TokenIdVo(id)
    }

}