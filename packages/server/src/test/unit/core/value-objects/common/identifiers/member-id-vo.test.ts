import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'

describe('MemberId inherited from UniqueIdentifierVo', () => {

    it('must create a valid memberId UUID inherited from UniqueIdentifierVo.', () => {

        const memberIdVo = MemberIdVo.create()
        const memberIdVo2 = MemberIdVo.create()

        expect(memberIdVo).toBeInstanceOf(UniqueIdentifier)
        expect(memberIdVo).toBeInstanceOf(MemberIdVo)

        expect(memberIdVo2).toBeInstanceOf(UniqueIdentifier)
        expect(memberIdVo2).toBeInstanceOf(MemberIdVo)

        expect(memberIdVo.value).not.toBe(memberIdVo2.value)
        expect(memberIdVo).not.toEqual(memberIdVo2)

    })

    it('must rehidrate an existing memberId UUID inherited from UniqueIdentifierVo.', () => {

        const memberIdVo = MemberIdVo.create()
        const memberIdStringVo = MemberIdVo.fromId(memberIdVo.value)
        
        expect(memberIdStringVo.value).toBe(memberIdVo.value)
        expect(memberIdStringVo).toEqual(memberIdVo)
        expect(memberIdStringVo.equals(memberIdVo)).toBe(true)
    })
})