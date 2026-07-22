import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test explicitly for E2E tests
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath, override: true });
