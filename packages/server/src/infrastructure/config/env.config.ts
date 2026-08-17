import dotenv from 'dotenv';
import path from 'path';
import z from "zod";
import { envSchema } from "./env.schema.js";

dotenv.config({ path: path.resolve(process.cwd(), 'packages/server/.env') });

dotenv.config(); 

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const tree = z.treeifyError(result.error)
    console.error('❌ Environment variables validation error')
    console.error(JSON.stringify(tree, null, 2))

    process.exit(1)
  }

  return Object.freeze(result.data)
}

export const env = parseEnv()

