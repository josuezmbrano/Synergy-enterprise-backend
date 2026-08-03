import { Prisma } from 'infrastructure/generated/prisma/client.js';
import { TransactionStorage } from './wrapper.transaction-storage.js';

export const txStorage = new TransactionStorage<Prisma.TransactionClient>()