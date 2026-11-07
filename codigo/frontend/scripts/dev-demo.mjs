#!/usr/bin/env node
// `npm run dev:demo`: servidor de desarrollo con datos de DEMOSTRACIÓN ficticios (codigo/backend/content/demo-source.ts).
// Funciona igual en Windows y Linux. En producción está prohibido: content/index.ts lanza un error.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['next', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TABLEMAROC_DEMO_DATA: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
