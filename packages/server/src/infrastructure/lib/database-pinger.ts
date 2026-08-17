import { PrismaClient } from "infrastructure/generated/prisma/client.js";

export class DatabasePinger {

    constructor(private readonly dbClient: PrismaClient) { }

    async ping(): Promise<void> {

        await this.dbClient.$queryRaw`SELECT 1`
    }
}