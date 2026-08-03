import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js'
import { UserDomainError } from 'core/errors/domain/domain-classes.error.js';
import { expectDomainError } from 'test/utils/test-errors.utils.js';
import { IPasswordHasher } from 'core/services/password-interface.service.js';


describe('UserPasswordVo create and hash methods, validation and prop testing', () => {

    describe('UserPasswordVo Create method', () => {

        it('must create an UserPassword value object if all validations are correct', () => {

            const inputPassword = 'Josuezamb61'
            const passwordVo = UserPasswordVo.create(inputPassword)

            const otherInputPassword = 'Josuezamb61'
            const otherPasswordVo = UserPasswordVo.create(otherInputPassword)

            expect(passwordVo.value).toBe('Josuezamb61')
            expect(otherPasswordVo.value).toBe('Josuezamb61')
            expect(passwordVo).toEqual(otherPasswordVo)
            expect(passwordVo).not.toBe(otherPasswordVo)

        })

        it('must throw an userValidationFailed with reason: REQUIRED, when input password is empty', () => {

            expectDomainError(UserDomainError, () => UserPasswordVo.create(''), 4, undefined, 'REQUIRED', 'password')
        })

        it('must throw an userValidationFailed with reason: LENGTH_MISMATCH, if password does not meet min characters limit', () => {

            expectDomainError(UserDomainError, () => UserPasswordVo.create('1234567'), 4, undefined, 'LENGTH_MISMATCH', 'password')
        })

        it('must throw an userValidationFailed with reason: LENGTH_MISMATCH, if password does not meet max characters limit', () => {

            const longPassword = 'a'.repeat(101)
            expectDomainError(UserDomainError, () => UserPasswordVo.create(longPassword), 4, undefined, 'LENGTH_MISMATCH', 'password')
        })

        it('must throw an userValidationFailed with reason: WEAK_PASSWORD, if password does not meet regex requirements', () => {

            expectDomainError(UserDomainError, () => UserPasswordVo.create('Asdfghjg'), 4, undefined, 'WEAK_PASSWORD', 'password')
        })

    });


    describe('UserPasswordVo create and hash method', () => {

        it('should validate plain password, call hasher, and return hashed UserPasswordVo', async () => {

            const plainPassword = 'Password123!';
            const mockedHashValue = '$2b$10$fakeHashedPasswordValue';


            const mockPasswordHasher: IPasswordHasher = {
                hash: vi.fn().mockResolvedValue(mockedHashValue),
                compare: vi.fn(),
            };


            const hashedPasswordVo = await UserPasswordVo.createAndHash(
                plainPassword,
                mockPasswordHasher
            );


            expect(hashedPasswordVo.value).toBe(mockedHashValue);


            expect(mockPasswordHasher.hash).toHaveBeenCalledWith(plainPassword);
            expect(mockPasswordHasher.hash).toHaveBeenCalledTimes(1);
        });
    })

})

