import dotenv from 'dotenv'
import path from 'path'

const serverDir = process.cwd();

dotenv.config({ path: path.resolve(serverDir, '../../.env') });

dotenv.config({ path: path.resolve(serverDir, '.env'), override: true });

dotenv.config({ path: path.resolve(serverDir, '.env.test'), override: true });