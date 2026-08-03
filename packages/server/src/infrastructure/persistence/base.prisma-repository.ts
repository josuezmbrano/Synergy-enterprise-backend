import { Prisma, PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { txStorage } from './context/tx-storage.js';

export abstract class BasePrismaRepository {
    constructor(protected readonly prisma: PrismaClient) {}

    protected getClient(): PrismaClient | Prisma.TransactionClient {
        const tx = txStorage.getStore()
        return tx ?? this.prisma
    }
}