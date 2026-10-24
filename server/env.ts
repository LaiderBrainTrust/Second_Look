import { existsSync } from 'node:fs';

// Built-in Node loader; exported environment values take precedence.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
