import dotenv from 'dotenv';
import path from 'path';
import z from "zod";
import { envSchema } from "./env.schema.js";
import { bootstrapLogger } from './modules/logger.config.js';

dotenv.config({ path: path.resolve(process.cwd(), 'packages/server/.env') });

dotenv.config();

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const tree = z.treeifyError(result.error)
    bootstrapLogger.error({ validationErrorTree: tree }, '❌ Environment variables validation error')

    process.exit(1)
  }

  return Object.freeze(result.data)
}

export const env = parseEnv()

