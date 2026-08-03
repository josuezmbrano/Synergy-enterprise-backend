import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import prisma from 'infrastructure/lib/prisma.js';
import { PrismaVerificationTokenRepository } from 'infrastructure/repositories/token.prisma.js';
import { TokenMother } from 'test/builders/token.mother.js';
import { seedTokenDefault, seedTokenRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('PrismaVerificationTokenRepository - Integration Tests', () => {
    let tokenRepository: PrismaVerificationTokenRepository;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.user.deleteMany({});

        tokenRepository = new PrismaVerificationTokenRepository(prisma);
    })


    describe('saveToken()', () => {

        it('should successfully INSERT a new token connected to an existing user via public_id', async () => {
            const user = await seedUserRandom(prisma);

            const tokenEntity = TokenMother.reconstituteDefault({
                userId: UserIdVo.fromId(user.publicId.value)
            });

            await tokenRepository.saveToken(tokenEntity);

            const dbCheck = await prisma.verificationToken.findUnique({
                where: { token: tokenEntity.id.value }
            });

            expect(dbCheck).not.toBeNull();
            expect(dbCheck?.token).toBe(tokenEntity.id.value);
            expect(dbCheck?.user_id).toBe(user.publicId.value);
            expect(dbCheck?.type).toBe(tokenEntity.type.value);
        });
    });

    describe('deleteToken()', () => {

        it('should successfully DELETE a token when both token string and user_id match perfectly', async () => {
            const user = await seedUserRandom(prisma);

            await seedTokenDefault(prisma, user.publicId.value);

            const tokenEntity = TokenMother.reconstituteDefault({
                userId: UserIdVo.fromId(user.publicId.value)
            });

            await tokenRepository.deleteToken(tokenEntity);

            const dbCheck = await prisma.verificationToken.findUnique({
                where: { token: tokenEntity.id.value }
            });
            expect(dbCheck).toBeNull();
        });

        it('should throw an InfraError or fail cleanly if trying to delete a token with a mismatched user_id', async () => {
            const user1 = await seedUserRandom(prisma);
            const user2 = await seedUserRandom(prisma, {username: UserUsernameVo.create('newtokenUsername'), email: UserEmailVo.create('newtokenuseremail@gmail.com')});


            const token = await seedTokenDefault(prisma, user1.publicId.value);

            const maliciousTokenEntity = TokenMother.reconstituteDefault({
                userId: UserIdVo.fromId(user2.publicId.value)
            });

            await expect(tokenRepository.deleteToken(maliciousTokenEntity))
                .rejects
                .toThrow();

            const dbCheck = await prisma.verificationToken.findUnique({
                where: { token: token.id.value }
            });

            expect(dbCheck).not.toBeNull();
            expect(dbCheck?.user_id).toBe(user1.publicId.value);
        });
    });

    describe('findByToken()', () => {

        it('should return the mapped token domain entity when the token string exists', async () => {
            const user = await seedUserRandom(prisma);

            const token = await seedTokenDefault(prisma, user.publicId.value, { type: TokenTypeVo.createEmailVerification() });

            const foundToken = await tokenRepository.findByToken(TokenIdVo.fromId(token.id.value));

            expect(foundToken).not.toBeNull();
            expect(foundToken?.id.value).toBe(token.id.value);
            expect(foundToken?.userId.value).toBe(user.publicId.value);
            expect(foundToken?.type.value).toBe('EMAIL_VERIFICATION');
        });

        it('should return null cleanly when the searched token string does not exist', async () => {
            const result = await tokenRepository.findByToken(TokenIdVo.fromId('f47ac10b-58cc-4372-a567-0e02b2c3d479'));
            expect(result).toBeNull();
        });
    });

    describe('findByUser()', () => {

        it('should return the first active token found matching the user account id', async () => {
            const user = await seedUserRandom(prisma);

            const token = await seedTokenDefault(prisma, user.publicId.value, { type: TokenTypeVo.createPasswordReset() });

            const foundToken = await tokenRepository.findByUser(UserIdVo.fromId(user.publicId.value));

            expect(foundToken).not.toBeNull();
            expect(foundToken?.id.value).toBe(token.id.value);
            expect(foundToken?.userId.value).toBe(user.publicId.value);
            expect(foundToken?.type.value).toBe('PASSWORD_RESET');
        });

        it('should return the most recent active token matching the user account id (LIFO / Order DESC)', async () => {

            vi.useFakeTimers();

            const user = await seedUserRandom(prisma);

            await seedTokenDefault(prisma, user.publicId.value, { 
                type: TokenTypeVo.createEmailVerification()
            });

            vi.advanceTimersByTime(1000 * 60 * 5);

            const newToken = await seedTokenRandom(prisma, user.publicId.value, new Date())

            const foundToken = await tokenRepository.findByUser(UserIdVo.fromId(user.publicId.value));

            expect(foundToken).not.toBeNull();
            expect(foundToken?.id.value).toBe(newToken.id.value);
            expect(foundToken?.userId.value).toBe(user.publicId.value);
            expect(foundToken?.type.value).toBe('PASSWORD_RESET'); 

            vi.useRealTimers();
        });

        it('should return null cleanly when the user has no registered tokens', async () => {
            const randomUserId = UserIdVo.fromId('a2584318-208b-4d4b-ae84-82559fd108a9');

            const result = await tokenRepository.findByUser(randomUserId);
            expect(result).toBeNull();
        });
    });

})
