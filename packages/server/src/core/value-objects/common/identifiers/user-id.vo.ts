import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'


export class UserIdVo extends UniqueIdentifier<'UserIdVo'> {

    protected readonly identifierType = 'UserIdVo' as const;

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): UserIdVo {
        return new UserIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): UserIdVo {
        return new UserIdVo(id)
    }

}