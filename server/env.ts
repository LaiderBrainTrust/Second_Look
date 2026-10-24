import { existsSync } from 'node:fs';

// Built-in Node loader; exported environment values take precedence.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (process.env.ROUNDTABLE_ENV_FILE && existsSync(process.env.ROUNDTABLE_ENV_FILE)) process.loadEnvFile(process.env.ROUNDTABLE_ENV_FILE);
