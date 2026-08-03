import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'

describe('TaskId inherited from UniqueIdentifierVo', () => {

    it('must create a valid taskId UUID inherited from UniqueIdentifierVo.', () => {

        const taskIdVo = TaskIdVo.create()
        const taskIdVo2 = TaskIdVo.create()

        expect(taskIdVo).toBeInstanceOf(UniqueIdentifier)
        expect(taskIdVo).toBeInstanceOf(TaskIdVo)

        expect(taskIdVo2).toBeInstanceOf(UniqueIdentifier)
        expect(taskIdVo2).toBeInstanceOf(TaskIdVo)

        expect(taskIdVo.value).not.toBe(taskIdVo2.value)
        expect(taskIdVo).not.toEqual(taskIdVo2)

    })

    it('must rehidrate an existing TaskId UUID inherited from UniqueIdentifierVo.', () => {

        const taskIdVo = TaskIdVo.create()
        const taskIdStringVo = TaskIdVo.fromId(taskIdVo.value)
        
        expect(taskIdStringVo.value).toBe(taskIdVo.value)
        expect(taskIdStringVo).toEqual(taskIdVo)
        expect(taskIdStringVo.equals(taskIdVo)).toBe(true)
    })
})