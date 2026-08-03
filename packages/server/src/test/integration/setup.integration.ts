import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { Client } from 'pg'



const baseDatabaseUrl = process.env.INTERNAL_TEST_BASE_URL

if (!baseDatabaseUrl) {
    throw new Error('Could not locate container base URL. Make sure global setup execute properly.')
}

const uniqueSchema = `test_schema_${Math.random().toString(36).substring(2, 11)}`
const fileDatabaseUrl = `${baseDatabaseUrl}?schema=${uniqueSchema}&options=-c%20search_path%3D${uniqueSchema}`


process.env.DATABASE_URL = fileDatabaseUrl
console.log(process.env.DATABASE_URL)


beforeAll(async () => {
    execSync(`npx prisma db push`, {
        env: { ...process.env, DATABASE_URL: fileDatabaseUrl },
        stdio: 'ignore'
    })
})


afterAll(async () => {
    const { default: prisma } = await import('infrastructure/lib/prisma.js')
    await prisma.$disconnect()

    const client = new Client({ connectionString: baseDatabaseUrl })
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS "${uniqueSchema}" CASCADE`)
    await client.end()
})
