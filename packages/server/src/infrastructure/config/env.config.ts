import z from "zod";
import { Env, envSchema } from "./env.schema.js";



export const getEnv = (): Env => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const tree = z.treeifyError(result.error)
    console.error('❌ Environment variables validation error:\n', tree)

    throw new Error('Invalid environment variables. See process.stderr output above.')
  }

  return Object.freeze(result.data)
}


