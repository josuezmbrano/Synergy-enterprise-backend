import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'packages/server/.env') });

dotenv.config(); 

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: Number(process.env.PORT) || 4000,
};


if (!ENV.DATABASE_URL) {
  throw new Error(
    '❌ CRITICAL INFRASTRUCTURE ERROR: DATABASE_URL (Neon) is not defined'
  );
}