import { LoginUserCase } from 'application/use-cases/user/login-user.usecase.js'
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IAuthService } from 'core/services/auth-interface.service.js'
import { IPasswordHasher } from 'core/services/password-interface.service.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'

describe('LoginUserCase.', () => {

    let sut: LoginUserCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>
    let mockAuthService: MockProxy<IAuthService>

    beforeEach(() => {
        vi.clearAllMocks()
        mockUserRepository = mock<IUserRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        mockAuthService = mock<IAuthService>()
        sut = new LoginUserCase(mockUserRepository, mockPasswordHasher, mockAuthService)
    })


    describe('Login input validations (PHASE 1).', () => {

        it('should throw invalid credentials and USE dummy password when user is not found (Timing Attack Protection)', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            const input = { email: 'notfound@gmail.com', password: 'AnyPassword123!' };

            await expect(sut.execute(input)).rejects.toThrow(AuthErrorFactory.invalidCredentials().message);

            expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
                input.password,
                expect.stringContaining('$2a$10$')
            );
            expect(mockAuthService.generateToken).not.toHaveBeenCalled();
        });

        it('should throw an AuthDomain invalid credentials error if user is found by email but password is incorrect', async () => {
            const user = UserMother.reconstituteDefault()
            mockUserRepository.findByEmail.mockResolvedValue(user)
            mockPasswordHasher.compare.mockResolvedValue(false)

            const input = { email: 'some@gmail.com', password: 'ronalcristiano3032' }

            await expect(sut.execute(input)).rejects.toThrow(AuthErrorFactory.invalidCredentials().message)
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith({ _props: 'some@gmail.com', voType: "UserEmailVo" })
            expect(mockPasswordHasher.compare).toHaveBeenCalledWith('ronalcristiano3032', user.password.value)
            expect(mockAuthService.generateToken).not.toHaveBeenCalled();
        })

        it('should throw a UserDomain user suspended locked error and NOT generate token if user is suspended', async () => {
            const user = UserMother.createSuspended();
            mockUserRepository.findByEmail.mockResolvedValue(user);
            mockPasswordHasher.compare.mockResolvedValue(true);

            await expect(sut.execute({ email: user.email.value, password: 'CorrectPass123!' }))
                .rejects.toThrow(UserErrorFactory.userSuspendedLocked().message);

            expect(mockAuthService.generateToken).not.toHaveBeenCalled();
        });
    })

    describe('Successful Login & Mapping (PHASE 2)', () => {

        it('should generate a valid session token and return full data object output (user, token)', async () => {
            const user = UserMother.reconstituteDefault();
            const token = 'valid.token';

            mockUserRepository.findByEmail.mockResolvedValue(user);
            mockPasswordHasher.compare.mockResolvedValue(true);
            mockAuthService.generateToken.mockResolvedValue(token);

            const result = await sut.execute({
                email: user.email.value,
                password: 'CorrectPass123!'
            });

            expect(result).toEqual({
                user: {
                    id: user.publicId.value,
                    username: user.username.value,
                    fullname: user.fullname,
                    email: user.email.value,
                    status: user.status.value,
                    createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
                    verifiedAt: user.isValidated ? expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) : null
                },
                token: token
            });

            expect(mockAuthService.generateToken).toHaveBeenCalledWith({
                sub: user.publicId.value,
                verified: user.isValidated,
                role: 'user'
            });
        })
    })


})