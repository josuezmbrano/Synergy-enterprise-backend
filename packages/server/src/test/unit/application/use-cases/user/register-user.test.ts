import { LoggerPort } from 'application/ports/logger.port.js'
import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { RegisterUserCase } from 'application/use-cases/user/register-user.usecase.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IAuthService } from 'core/services/auth-interface.service.js'
import { IMailService } from 'core/services/mail-interface.service.js'
import { IPasswordHasher } from 'core/services/password-interface.service.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'


describe('RegisterUserCase.', () => {

    let sut: RegisterUserCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>
    let mockAuthService: MockProxy<IAuthService>
    let mockMailService: MockProxy<IMailService>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>
    let mockLogger: MockProxy<LoggerPort>

    beforeEach(() => {
        vi.clearAllMocks()
        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        mockAuthService = mock<IAuthService>()
        mockMailService = mock<IMailService>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()
        mockLogger = mock<LoggerPort>()

        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new RegisterUserCase(mockUserRepository, mockPasswordHasher, mockAuthService, mockTokenRepository, mockMailService, mockUnitOfWork, mockLogger)
    })


    describe('Username and email input validations (PHASE 1)', () => {

        it('should throw an UserDomain username already exists if username value received is taken', async () => {
            mockUserRepository.usernameExists.mockResolvedValue(true)
            const input = { username: 'randomvalue123', name: 'some name', lastname: 'some lastname', email: 'some@email.com', password: 'somepassword' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.usernameAlreadyExists().message)
            expect(mockUserRepository.usernameExists).toHaveBeenCalledWith(expect.objectContaining({ value: input.username }))
        })

        it('should throw an UserDomain email already exists if email value received is taken', async () => {
            mockUserRepository.usernameExists.mockResolvedValue(false)
            mockUserRepository.emailExists.mockResolvedValue(true)
            const input = { username: 'randomvalue123', name: 'some name', lastname: 'some lastname', email: 'some@email.com', password: 'somepassword' }

            await expect(sut.execute(input)).rejects.toThrow(UserErrorFactory.emailAlreadyExists().message)
            expect(mockUserRepository.emailExists).toHaveBeenCalledWith(expect.objectContaining({ value: input.email }))
        })
    })

    describe('User creation and persistence (PHASE 2)', () => {

        it('should hash the password, create user entity and persist to repository', async () => {
            const user = UserMother.createDefault()

            mockUserRepository.usernameExists.mockResolvedValue(false)
            mockUserRepository.emailExists.mockResolvedValue(false)
            mockPasswordHasher.hash.mockResolvedValue('Hash_123!')
            mockUserRepository.save.mockResolvedValue(user)

            const input = { username: 'randomvalue123', name: 'some name', lastname: 'some lastname', email: 'some@email.com', password: 'Somepassword123' }

            await sut.execute(input)

            expect(mockPasswordHasher.hash).toHaveBeenCalledWith(input.password)
            expect(mockUnitOfWork.run).toHaveBeenCalled()
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(Object))
        })
    })

    describe('Post registration orchestration (PHASE 3)', () => {

        it('should execute successfully even if the mail service fails (Resilience Rule)', async () => {

            const newUser = UserMother.create()
            const mailError = new Error('SMTP Connection Timeout')

            mockUserRepository.usernameExists.mockResolvedValue(false)
            mockUserRepository.emailExists.mockResolvedValue(false)
            mockPasswordHasher.hash.mockResolvedValue('hash_fake')
            mockAuthService.generateToken.mockResolvedValue('session_token_123')

            mockMailService.sendEmail.mockRejectedValue(mailError)
            mockUserRepository.save.mockResolvedValue(newUser)

            const input = {
                username: newUser.username.value,
                name: newUser.name.value,
                lastname: newUser.lastname.value,
                email: newUser.email.value,
                password: 'SomePassword123'
            }

            const result = await sut.execute(input)

            expect(result.token).toBe('session_token_123')
            expect(mockUserRepository.save).toHaveBeenCalled()
            expect(mockTokenRepository.saveToken).toHaveBeenCalled()

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.any(String),
                mailError,
                {
                    email: newUser.email.value,
                    userId: newUser.publicId.value
                }
            )
        })

        it('should return output with expected DTO format and generate session token', async () => {

            const newUser = UserMother.create()
            mockUserRepository.usernameExists.mockResolvedValue(false)
            mockUserRepository.emailExists.mockResolvedValue(false)
            mockPasswordHasher.hash.mockResolvedValue('hash_fake')
            mockAuthService.generateToken.mockResolvedValue('session_token_123')
            mockUserRepository.save.mockResolvedValue(newUser)

            const input = {
                username: newUser.username.value,
                name: newUser.name.value,
                lastname: newUser.lastname.value,
                email: newUser.email.value,
                password: 'SomePassword123'
            }


            const result = await sut.execute(input)


            expect(result.user).toEqual({
                id: expect.any(String),
                username: newUser.username.value,
                fullname: newUser.fullname,
                email: newUser.email.value,
                status: newUser.status.value,
                createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
                verifiedAt: null
            })
            expect(result.token).toBe('session_token_123')
            expect(mockAuthService.generateToken).toHaveBeenCalledWith({
                sub: expect.any(String),
                role: 'user',
                verified: false
            })
        })
    })

})