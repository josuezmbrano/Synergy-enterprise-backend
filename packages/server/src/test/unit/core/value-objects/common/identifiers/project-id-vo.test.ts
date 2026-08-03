import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'

describe('ProjectId inherited from UniqueIdentifierVo', () => {

    it('must create a valid projectId UUID inherited from UniqueIdentifierVo.', () => {

        const projectIdVo = ProjectIdVo.create()
        const projectIdVo2 = ProjectIdVo.create()

        expect(projectIdVo).toBeInstanceOf(UniqueIdentifier)
        expect(projectIdVo).toBeInstanceOf(ProjectIdVo)

        expect(projectIdVo2).toBeInstanceOf(UniqueIdentifier)
        expect(projectIdVo2).toBeInstanceOf(ProjectIdVo)

        expect(projectIdVo.value).not.toBe(projectIdVo2.value)
        expect(projectIdVo).not.toEqual(projectIdVo2)

    })

    it('must rehidrate an existing ProjectId UUID inherited from UniqueIdentifierVo.', () => {

        const projectIdVo = ProjectIdVo.create()
        const projectIdStringVo = ProjectIdVo.fromId(projectIdVo.value)
        
        expect(projectIdStringVo.value).toBe(projectIdVo.value)
        expect(projectIdStringVo).toEqual(projectIdVo)
        expect(projectIdStringVo.equals(projectIdVo)).toBe(true)
    })
})