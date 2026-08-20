import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { Client } from 'pg'
import { bootstrapLogger } from 'infrastructure/config/modules/logger.config.js'


const baseDatabaseUrl = process.env.INTERNAL_TEST_BASE_URL

if (!baseDatabaseUrl) {
    const errorMsg = 'Could not locate container base URL. Make sure global setup execute properly.'
    bootstrapLogger.error(errorMsg)
    throw new Error(errorMsg)
}

const uniqueSchema = `test_schema_${Math.random().toString(36).substring(2, 11)}`
const fileDatabaseUrl = `${baseDatabaseUrl}?schema=${uniqueSchema}&options=-c%20search_path%3D${uniqueSchema}`


process.env.DATABASE_URL = fileDatabaseUrl

bootstrapLogger.info({ schema: uniqueSchema }, '🧪 [Integration Setup] Isolated database schema generated')


beforeAll(async () => {
    try {
        bootstrapLogger.info({ schema: uniqueSchema }, '⚡ [Integration Setup] Pushing Prisma schema to ephemeral database...')

        execSync('npx prisma db push', {
            env: { ...process.env, DATABASE_URL: fileDatabaseUrl },
            stdio: 'ignore'
        })

        bootstrapLogger.info({ schema: uniqueSchema }, '✅ [Integration Setup] Schema initialized successfully')
    } catch (error) {
        bootstrapLogger.error(error, '❌ [Integration Setup] Failed to push Prisma schema')
        throw error;
    }
})


afterAll(async () => {
    try {
        // Desconexión limpia del cliente Prisma singleton
        const { default: prisma } = await import('infrastructure/lib/prisma.js')
        await prisma.$disconnect()

        // Limpieza y destrucción del schema temporal
        const client = new Client({ connectionString: baseDatabaseUrl })
        await client.connect()
        await client.query(`DROP SCHEMA IF EXISTS "${uniqueSchema}" CASCADE`)
        await client.end()

        bootstrapLogger.info({ schema: uniqueSchema }, '🗑️ [Integration Setup] Temporary schema dropped cleanly')
    } catch (error) {
        bootstrapLogger.error(error, '⚠️ [Integration Setup] Failed to cleanup isolated schema')
    }
})
