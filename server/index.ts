import './env.js';
import { mkdirSync } from 'node:fs';
import { createApp } from './app.js';
import { createStore } from './store.js';

if (process.env.NODE_ENV === 'production') throw new Error('Local scaffold only: implement participant authentication before production hosting.');
mkdirSync('.local', { recursive: true });
const store = createStore('.local/second-look.sqlite');
const server = createApp(store).listen(3001, '127.0.0.1', () => console.log('Second Look synthetic API: http://127.0.0.1:3001'));
const stop = () => server.close(() => { store.close(); process.exit(0); });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
