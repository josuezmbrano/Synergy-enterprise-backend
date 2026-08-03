import { BaseIdentifier } from 'core/value-objects/base.identifier.js';

class UserIdentifierStub extends BaseIdentifier<string> {

    public readonly identifierType = 'UserIdentifierStub';

    constructor(value: string) { super(value); }
    static create(value: string) { return new UserIdentifierStub(value); }
}

class ProductIdentifierStub extends BaseIdentifier<string> {

    public readonly identifierType = 'ProductIdentifierStub';

    constructor(value: string) { super(value); }
    static create(value: string) { return new ProductIdentifierStub(value); }
}

class NumberIdentifierStub extends BaseIdentifier<number> {

    public readonly identifierType = 'NumberIdentifierStub';

    constructor(value: number) { super(value); }
    static create(value: number) { return new NumberIdentifierStub(value); }
}

class CompositeId extends BaseIdentifier<{s: number}> {

    public readonly identifierType = 'CompositeIdentifierStub';

    constructor(value: {s: number}) {super(value); }
    static create(value: {s: number}) {return new CompositeId(value); }
}

describe('BaseIdentifier Core Logic', () => {

    describe('Value Retrieval', () => {
        it('should correctly return the internal value', () => {
            const id = 'uuid-test';
            const identifier = UserIdentifierStub.create(id);
            expect(identifier.value).toBe(id);
        });
    });

    describe('Equality Logic (equals)', () => {
        it('should return true if values and classes are identical', () => {
            const idValue = '12345';
            const id1 = UserIdentifierStub.create(idValue);
            const id2 = UserIdentifierStub.create(idValue);
            
            expect(id1.equals(id2)).toBe(true);
        });

        it('should return true for numeric identifiers with same value', () => {
            const id1 = NumberIdentifierStub.create(100);
            const id2 = NumberIdentifierStub.create(100);
            
            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false if compared with null or undefined', () => {
            const id = UserIdentifierStub.create('uuid');
            expect(id.equals(undefined)).toBe(false);
            expect(id.equals(null as any)).toBe(false);
        });

        it('should return false if the other object is not an instance of BaseIdentifier', () => {
            const id = UserIdentifierStub.create('uuid');
            const plainObject = { _value: 'uuid', value: 'uuid' };
            
            expect(id.equals(plainObject as any)).toBe(false);
        });

        it('should return false if values are same but classes (types) are different', () => {
            const commonId = 'same-uuid';
            const userId = UserIdentifierStub.create(commonId);
            const productId = ProductIdentifierStub.create(commonId);
            
            expect(userId.equals(productId)).toBe(false);
            expect(userId.constructor.name).not.toBe(productId.constructor.name);
        });

        it('should return false if values are different', () => {
            const id1 = UserIdentifierStub.create('id-1');
            const id2 = UserIdentifierStub.create('id-2');
            
            expect(id1.equals(id2)).toBe(false);
        });

        it('should use isEqual for deep comparison if T is a complex object', () => {

            const id1 = CompositeId.create({s: 1})
            const id2 = CompositeId.create({s: 1});
            
            expect(id1.equals(id2)).toBe(true);
        });
    });
});