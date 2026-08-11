import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'


export class TaskIdVo extends UniqueIdentifier<'TaskIdVo'> {

    protected readonly identifierType = 'TaskIdVo' as const;

    private constructor(uuid: string) {
        super(uuid)
    }

    public static create(): TaskIdVo {
        return new TaskIdVo(crypto.randomUUID())
    }

    public static fromId(id: string): TaskIdVo {
        return new TaskIdVo(id)
    }

}