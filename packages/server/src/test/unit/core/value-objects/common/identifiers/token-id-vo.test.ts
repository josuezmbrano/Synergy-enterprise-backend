import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'

describe('TokenId inherited from UniqueIdentifierVo', () => {

    it('must create a valid tokenId UUID inherited from UniqueIdentifierVo.', () => {

        const tokenIdVo = TokenIdVo.create()
        const tokenIdVo2 = TokenIdVo.create()

        expect(tokenIdVo).toBeInstanceOf(UniqueIdentifier)
        expect(tokenIdVo).toBeInstanceOf(TokenIdVo)

        expect(tokenIdVo2).toBeInstanceOf(UniqueIdentifier)
        expect(tokenIdVo2).toBeInstanceOf(TokenIdVo)

        expect(tokenIdVo.value).not.toBe(tokenIdVo2.value)
        expect(tokenIdVo).not.toEqual(tokenIdVo2)

    })

    it('must rehidrate an existing TokenId UUID inherited from UniqueIdentifierVo.', () => {

        const tokenIdVo = TokenIdVo.create()
        const tokenIdStringVo = TokenIdVo.fromId(tokenIdVo.value)
        
        expect(tokenIdStringVo.value).toBe(tokenIdVo.value)
        expect(tokenIdStringVo).toEqual(tokenIdVo)
        expect(tokenIdStringVo.equals(tokenIdVo)).toBe(true)
    })
})