import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js'
import { RegisterUserCase } from 'application/use-cases/user/register-user.usecase.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { ITokenRepository } from 'core/repositories/token.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { IAuthService } from 'application/ports/auth-interface.service.js'
import { IPasswordHasher } from 'core/ports/password-interface.service.js'
import { UserMother } from 'test/builders/user.mother.js'
import { mock, MockProxy } from 'vitest-mock-extended'
import { IEventBus } from 'application/ports/event-bus.port.js'
import { UserRegisteredEvent } from 'core/events/user-events/user-registered.event.js'


describe('RegisterUserCase.', () => {

    let sut: RegisterUserCase
    let mockUserRepository: MockProxy<IUserRepository>
    let mockTokenRepository: MockProxy<ITokenRepository>
    let mockPasswordHasher: MockProxy<IPasswordHasher>
    let mockAuthService: MockProxy<IAuthService>
    let mockEventBus: MockProxy<IEventBus>
    let mockUnitOfWork: MockProxy<IBaseUnitOfWork>
    

    beforeEach(() => {
        vi.clearAllMocks()
        mockUserRepository = mock<IUserRepository>()
        mockTokenRepository = mock<ITokenRepository>()
        mockPasswordHasher = mock<IPasswordHasher>()
        mockAuthService = mock<IAuthService>()
        mockEventBus = mock<IEventBus>()
        mockUnitOfWork = mock<IBaseUnitOfWork>()

        mockUnitOfWork.run.mockImplementation(async (work) => await work())

        sut = new RegisterUserCase(mockUserRepository, mockPasswordHasher, mockAuthService, mockTokenRepository, mockEventBus, mockUnitOfWork)
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

        it('should publish UserRegisteredEvent after saving user and token', async () => {
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

            await sut.execute(input)

            
            expect(mockTokenRepository.saveToken).toHaveBeenCalled()

            
            expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                expect.any(UserRegisteredEvent)
            )

            
            const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserRegisteredEvent
            expect(publishedEvent.aggregateId).toBe(newUser.publicId.value)
            expect(publishedEvent.payload.fullname).toBe(newUser.fullname)
            expect(publishedEvent.payload.email).toBe(newUser.email.value)
            expect(publishedEvent.payload.verificationToken).toEqual(expect.any(String))
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