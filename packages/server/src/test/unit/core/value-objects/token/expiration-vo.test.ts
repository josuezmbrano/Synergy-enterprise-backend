import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js'

describe('TokenExpirationVo creation, validation and prop testing.', () => {

    it('must create a default expiration date vo with a time of 24 hours.', () => {

        const expirationVo = TokenExpirationVo.createDefaultExpiration()
        const now = new Date()

        const diffInMs = expirationVo.value.getTime() - now.getTime()
        const diffInHours = Math.round(diffInMs / (1000 * 60 * 60))

        expect(diffInHours).toBe(24)
    })

    it('must retrieve and hydrate a preexisting expiration date vo from both date or string value.', () => {

        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + 24)

        const string = expirationDate.toISOString()


        const expirationRetrievedDateVo = TokenExpirationVo.fromDatabase(expirationDate)
        const expirationRetrievedStringVo = TokenExpirationVo.fromDatabase(string)

        const evaluatedTime = (formatDateVo: TokenExpirationVo) => {

            const now = new Date()

            const diffInMs = formatDateVo.value.getTime() - now.getTime()
            const diffInHours = Math.round(diffInMs / (1000 * 60 * 60))

            return diffInHours
        }

        expect(evaluatedTime(expirationRetrievedDateVo)).toBe(24)
        expect(evaluatedTime(expirationRetrievedStringVo)).toBe(24)

    })

    it('should check the current boolean to track the expire state of the prop', () => {

        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 24);

        const expirationVo = TokenExpirationVo.fromDatabase(pastDate)
        expect(expirationVo.isExpired()).toBe(true)

        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const expirationVo2 = TokenExpirationVo.fromDatabase(tomorrow)
        expect(expirationVo2.isExpired()).toBe(false)
    })

})