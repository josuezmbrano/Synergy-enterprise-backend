import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'

describe('UserId inherited from UniqueIdentifierVo', () => {

    it('must create a valid userId UUID inherited from UniqueIdentifierVo.', () => {

        const userIdVo = UserIdVo.create()
        const userIdVo2 = UserIdVo.create()

        expect(userIdVo).toBeInstanceOf(UniqueIdentifier)
        expect(userIdVo).toBeInstanceOf(UserIdVo)

        expect(userIdVo2).toBeInstanceOf(UniqueIdentifier)
        expect(userIdVo2).toBeInstanceOf(UserIdVo)

        expect(userIdVo.value).not.toBe(userIdVo2.value)
        expect(userIdVo).not.toEqual(userIdVo2)

    })

    it('must rehidrate an existing UserId UUID inherited from UniqueIdentifierVo.', () => {

        const userIdVo = UserIdVo.create()
        const userIdStringVo = UserIdVo.fromId(userIdVo.value)
        
        expect(userIdStringVo.value).toBe(userIdVo.value)
        expect(userIdStringVo).toEqual(userIdVo)
        expect(userIdStringVo.equals(userIdVo)).toBe(true)
    })
})