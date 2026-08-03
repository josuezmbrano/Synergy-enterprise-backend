import { BaseValueObject } from 'core/value-objects/base.value-objects.js';

class StringVoStub extends BaseValueObject<string> {

    public readonly voType = 'StringVoStub';

    constructor(value: string) { super(value); }
    static create(value: string) { return new StringVoStub(value); }
}

class ObjectVoStub extends BaseValueObject<{ name: string; age: number }> {

    public readonly voType = 'ObjectVoStub';

    constructor(value: { name: string; age: number }) { super(value); }
    static create(value: { name: string; age: number }) { return new ObjectVoStub(value); }
}

class DifferentVoStub extends BaseValueObject<string> {

    public readonly voType = 'DifferentVoStub';

    constructor(value: string) { super(value); }
    static create(value: string) { return new DifferentVoStub(value); }
}

describe('BaseValueObject Core Logic', () => {

    describe('Immutability (Object.freeze)', () => {
        it('should freeze the props if they are an object', () => {
            const data = { name: 'Josué', age: 30 };
            const vo = ObjectVoStub.create(data);

            expect(() => {
                (vo.value as any).name = 'Cambiado';
            }).toThrow();
            
            expect(vo.value.name).toBe('Josué');
        });

        it('should not attempt to freeze primitive values', () => {
            const vo = StringVoStub.create('test');
            expect(vo.value).toBe('test');
        });
    });

    describe('Equality Logic (equals)', () => {
        it('should return true if values and classes are identical', () => {
            const vo1 = StringVoStub.create('value');
            const vo2 = StringVoStub.create('value');
            
            expect(vo1.equals(vo2)).toBe(true);
        });

        it('should return true for complex objects with same content', () => {
            const vo1 = ObjectVoStub.create({ name: 'A', age: 10 });
            const vo2 = ObjectVoStub.create({ name: 'A', age: 10 });
            
            expect(vo1.equals(vo2)).toBe(true);
        });

        it('should return false if compared with null or undefined', () => {
            const vo = StringVoStub.create('test');
            expect(vo.equals(undefined)).toBe(false);
            expect(vo.equals(null as any)).toBe(false);
        });

        it('should return false if the other object is not a BaseValueObject', () => {
            const vo = StringVoStub.create('test');
            const notAVo = { value: 'test' };
            
            expect(vo.equals(notAVo as any)).toBe(false);
        });

        it('should return false if values are the same but classes are different', () => {
            const vo1 = StringVoStub.create('test');
            const vo2 = DifferentVoStub.create('test');
            
            expect(vo1.equals(vo2)).toBe(false);
            expect(vo1.constructor.name).not.toBe(vo2.constructor.name);
        });

        it('should return false if values are different', () => {
            const vo1 = StringVoStub.create('value1');
            const vo2 = StringVoStub.create('value2');
            
            expect(vo1.equals(vo2)).toBe(false);
        });
    });
});