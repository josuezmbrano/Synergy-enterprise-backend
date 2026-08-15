import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { PoolConfig, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import WebSocket from 'ws';
import { env } from 'infrastructure/config/env.config.js';
import { PrismaPg } from '@prisma/adapter-pg';

neonConfig.webSocketConstructor = WebSocket


const prismaClientSingleton = () => {


    // NATIVE TCP FOR TESTCONTAINERS LOCAL CONNECTION
    if (env.NODE_ENV === 'test') {
        const testUrl = process.env.DATABASE_URL

        if (!testUrl) throw new Error('FATAL: DATABASE_URL is missing in test environment')

        const parsedUrl = new URL(testUrl)
        const schemaName = parsedUrl.searchParams.get('schema') || 'public'

        return new PrismaClient({
            adapter: new PrismaPg(
                {
                    connectionString: testUrl,
                    options: `-c search_path=${schemaName}`
                },
                {
                    schema: schemaName
                }
            )
        })
    }


    // PRODUCTION / DEVELOPMENT NEON SERVERLESS CONNECTION
    neonConfig.webSocketConstructor = WebSocket;
    const connectionStringUrl = env.DATABASE_URL;

    const config: PoolConfig = {
        connectionString: connectionStringUrl,
    }

    const adapter = new PrismaNeon(config)

    return new PrismaClient({
        adapter: adapter
    })
}


const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof prismaClientSingleton> | undefined
}


const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma