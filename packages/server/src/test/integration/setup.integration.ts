import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { Client } from 'pg'
import { createPinoOptions } from 'infrastructure/config/modules/logger.config.js'
import { getEnv } from 'infrastructure/config/env.config.js'
import { pino } from 'pino'


const env = getEnv()

const pinoLogger = pino(createPinoOptions(env)) 


const baseDatabaseUrl = process.env.INTERNAL_TEST_BASE_URL

if (!baseDatabaseUrl) {
    const errorMsg = 'Could not locate container base URL. Make sure global setup execute properly.'
    pinoLogger.error(errorMsg)
    throw new Error(errorMsg)
}

const uniqueSchema = `test_schema_${Math.random().toString(36).substring(2, 11)}`
const fileDatabaseUrl = `${baseDatabaseUrl}?schema=${uniqueSchema}&options=-c%20search_path%3D${uniqueSchema}`


process.env.DATABASE_URL = fileDatabaseUrl

pinoLogger.info({ schema: uniqueSchema }, '🧪 [Integration Setup] Isolated database schema generated')


beforeAll(async () => {
    try {
        pinoLogger.info({ schema: uniqueSchema }, '⚡ [Integration Setup] Pushing Prisma schema to ephemeral database...')

        execSync('npx prisma db push', {
            env: { ...process.env, DATABASE_URL: fileDatabaseUrl },
            stdio: 'ignore'
        })

        pinoLogger.info({ schema: uniqueSchema }, '✅ [Integration Setup] Schema initialized successfully')
    } catch (error) {
        pinoLogger.error(error, '❌ [Integration Setup] Failed to push Prisma schema')
        throw error;
    }
})


afterAll(async () => {
    try {
        // Limpieza y destrucción del schema temporal
        const client = new Client({ connectionString: baseDatabaseUrl })
        await client.connect()

        const res = await client.query(`
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE current_setting('search_path', true) LIKE '%${uniqueSchema}%' 
            AND pid <> pg_backend_pid();
        `);

        const activeConnections = parseInt(res.rows[0].count, 10);
        pinoLogger.info({ schema: uniqueSchema, activeConnections }, '📊 [Integration Cleanup] Active connections snapshot');

        await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE current_setting('search_path', true) LIKE '%${uniqueSchema}%' 
            AND pid <> pg_backend_pid();
        `);

        await client.query(`DROP SCHEMA IF EXISTS "${uniqueSchema}" CASCADE`)
        await client.end()

        pinoLogger.info({ schema: uniqueSchema }, '🗑️ [Integration Setup] Temporary schema dropped cleanly')
    } catch (error) {
        pinoLogger.error(error, '⚠️ [Integration Setup] Failed to cleanup isolated schema')
    }
})
