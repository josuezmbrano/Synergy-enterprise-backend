import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js'
import { getEnv } from 'infrastructure/config/env.config.js';
import { createContainer } from 'infrastructure/container/di.config.js';
import { createDomainErrorAsserter } from 'test/utils/test-errors.utils.js'


class DummyIdentifierVo extends UniqueIdentifier<'DummyIdentifierVo'> {
    public readonly identifierType = 'DummyIdentifierVo';

    public static create(): DummyIdentifierVo {
        return new DummyIdentifierVo(crypto.randomUUID());
    }

    public static fromId(id: string): DummyIdentifierVo {
        DummyIdentifierVo.validate(id);
        return new DummyIdentifierVo(id);
    }
}

describe('UniqueIdentifierVo creation, validation and prop testing.', () => {

    let expectDomainError: ReturnType<typeof createDomainErrorAsserter>

    beforeAll(() => {
        const env = getEnv();
        const container = createContainer(env);
        const pinoLogger = container.loggerMonitorInstance;

        expectDomainError = createDomainErrorAsserter(pinoLogger);
    });

    it('must create a valid UUID unique identifier vo', () => {

        const uniqueIdentifier = DummyIdentifierVo.create()
        const uniqueIdentifier2 = DummyIdentifierVo.create()

        expect(uniqueIdentifier).not.toEqual(uniqueIdentifier2)
        expect(uniqueIdentifier.value).not.toBe(uniqueIdentifier2.value)
    })

    it('should throw an INVALID_UUID_FORMAT if validation fails due to wrong format', () => {

        expectDomainError(CommonDomainError, () => DummyIdentifierVo.validate('234-002-111-abcv', 'uniqueIdentifier'), 4, undefined, 'INVALID_UUID_FORMAT', 'uniqueIdentifier')
    })

    it('should fail if UUID is not version 4', () => {

        const uuidV1 = '550e8400-e29b-11d4-a716-446655440000';
        expectDomainError(CommonDomainError, () => DummyIdentifierVo.fromId(uuidV1), 4, undefined, 'INVALID_UUID_FORMAT', 'id')
    });

    it('must retrieve and hidrate an existing UUID from a string', () => {

        const uniqueIdentifierVo = DummyIdentifierVo.create()
        const uniqueIdentifierString = uniqueIdentifierVo.value
        const rehidratedIdentifierVo = DummyIdentifierVo.fromId(uniqueIdentifierString)

        expect(rehidratedIdentifierVo).toEqual(uniqueIdentifierVo)
        expect(rehidratedIdentifierVo.value).toBe(uniqueIdentifierVo.value)
    })

    it('should correctly compare two identical identifiers', () => {
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const vo1 = DummyIdentifierVo.fromId(id);
        const vo2 = DummyIdentifierVo.fromId(id);

        expect(vo1.equals(vo2)).toBe(true);
    });

    it('should convert the UUID to a string type id', () => {

        const uniqueIdentifier = DummyIdentifierVo.create()
        const uniqueIdentifierString = uniqueIdentifier.toString()

        expect(uniqueIdentifierString).toBeTypeOf('string')
        expect(uniqueIdentifierString).toBe(uniqueIdentifier.value)
    })

})