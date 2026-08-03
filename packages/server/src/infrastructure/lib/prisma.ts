import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { PoolConfig, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import WebSocket from 'ws';
import { ENV } from 'infrastructure/config/env.js';
import { PrismaPg } from '@prisma/adapter-pg';

neonConfig.webSocketConstructor = WebSocket


const prismaClientSingleton = () => {


    // NATIVE TCP FOR TESTCONTAINERS LOCAL CONNECTION
    if (process.env.NODE_ENV === 'test') {
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
    const connectionStringUrl = ENV.DATABASE_URL;

    if (!connectionStringUrl) {
        const error = new Error('FATAL: DATABASE_URL is missing in environment variables');
        error.name = 'ConfigurationError';
        throw error;
    }

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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma