import { IBaseUnitOfWork } from 'application/use-cases/base.unit-of-work.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { txStorage } from '../context/tx-storage.js';


export class PrismaUnitOfWork implements IBaseUnitOfWork {
    constructor(private readonly prisma: PrismaClient) { }

    async run<T>(work: () => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx) => {
            return txStorage.run(tx, work)
        })
    }
    
}