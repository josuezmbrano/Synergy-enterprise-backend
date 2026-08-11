import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'


export class ProjectIdVo extends UniqueIdentifier<'ProjectIdVo'> {

    protected readonly identifierType = 'ProjectIdVo' as const;

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): ProjectIdVo {
        return new ProjectIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): ProjectIdVo {
        return new ProjectIdVo(id)
    }

}