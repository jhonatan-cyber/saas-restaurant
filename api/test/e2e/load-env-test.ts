import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test from the monorepo root
const envPath = path.resolve(__dirname, '../../../.env.test');
dotenv.config({ path: envPath, override: true });
