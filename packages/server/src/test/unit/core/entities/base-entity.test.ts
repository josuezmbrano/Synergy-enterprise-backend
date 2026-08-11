import { BaseEntity } from 'core/entities/base.entity.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';

class UserEntityStub extends BaseEntity<UserIdVo, { username: string, email: string }> {

    public readonly entityType = 'UserEntityStub';

    private constructor(value: { username: string, email: string }, id: UserIdVo, createdAt?: DateVo, updatedAt?: DateVo) {
        super(id, value, createdAt, updatedAt)
    }

    static create(value: { username: string, email: string }, id: UserIdVo) { return new UserEntityStub(value, id) }

    public updateName(newName: string) {
        this._props.username = newName
        this.markAsUpdated()
    }

    public get updatedAtDate() {
        return this.updatedAt
    }
}

class DifferentEntityStub extends BaseEntity<UserIdVo, { username: string, email: string }> {

    public readonly entityType = 'DifferentEntityStub';

    private constructor(value: { username: string, email: string }, id: UserIdVo, createdAt?: DateVo, updatedAt?: DateVo) {
        super(id, value, createdAt, updatedAt)
    }
    static create(value: { username: string, email: string }, id: UserIdVo) { return new DifferentEntityStub(value, id) }
}


describe('Base entitie core logic.', () => {

    describe('Equality logic (Equals).', () => {

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });


        it('should return true if entity objects values are equal.', () => {

            const userIdVo = UserIdVo.fromId('a8b1c4e9-1234-4567-a890-9876543210ab')

            const user1 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, userIdVo)

            const user2 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, userIdVo)

            expect(user1.equals(user2)).toBe(true)
        })

        it('should return false if object is compared to null or undefined.', () => {

            const user1 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, UserIdVo.create())

            expect(user1.equals(undefined)).toBe(false)
            expect(user1.equals(null as any)).toBe(false)
        })

        it('should return false if the object compared is not an instance of BaseEntity', () => {

            const user1 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, UserIdVo.create())

            const notBaseEntity = { username: 'Josue Zambrano', email: 'josuezambrano@gmail.com' }

            expect(user1.equals(notBaseEntity as any)).toBe(false)
        })

        it('type error test if values are same but classes (types) are different', () => {

            const userIdVo = UserIdVo.fromId('a8b1c4e9-1234-4567-a890-9876543210ab')

            const user1 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, userIdVo)

            const user2 = DifferentEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, userIdVo)

            expect(user1.constructor.name).not.toBe(user2.constructor.name)

            // @ts-expect-error
            user1.equals(user2)
        })

        it('should update updatedAt date when markAsUpdated is called', () => {

            const userIdVo = UserIdVo.fromId('a8b1c4e9-1234-4567-a890-9876543210ab')

            const user1 = UserEntityStub.create({
                username: 'Josue Zambrano',
                email: 'josuezambrano@gmail.com'
            }, userIdVo)

            const initialUpdate = user1.updatedAtDate.value

            vi.advanceTimersByTime(10000)

            user1.updateName('Moises Zambrano')

            expect(user1.updatedAtDate.value.getTime()).toBeGreaterThan(initialUpdate.getTime())
        })
    })

})