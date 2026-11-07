#!/usr/bin/env node
// Prepara la carpeta build-output/ después de `npm run build`: la salida standalone de Next.js más los archivos
// que Next.js deja fuera a propósito (.next/static y public). Es lo único que se sube al servidor (config/deploy).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(frontend, '../..');
const standalone = join(frontend, '.next/standalone');
const out = join(repoRoot, 'build-output');
// outputFileTracingRoot es la raíz del repositorio: la aplicación queda en esta subcarpeta, no en la raíz de standalone.
const app = 'codigo/frontend';

if (!existsSync(join(standalone, app, 'server.js'))) throw new Error('No hay salida standalone: ejecuta antes npm run build');

rmSync(out, { recursive: true, force: true });
// verbatimSymlinks: node_modules de standalone usa enlaces relativos que deben seguir siendo relativos.
cpSync(standalone, out, { recursive: true, verbatimSymlinks: true });
cpSync(join(frontend, '.next/static'), join(out, app, '.next/static'), { recursive: true });
cpSync(join(frontend, 'public'), join(out, app, 'public'), { recursive: true });

// Red de seguridad: standalone copia los .env que encuentra, y los secretos del servidor viven en /etc/tablemaroc/app.env.
for (const name of ['.env', '.env.local', '.env.test.local', '.env.production', '.env.production.local']) {
  rmSync(join(out, app, name), { force: true });
  rmSync(join(out, name), { force: true });
}
console.log(`build-output listo (arranque: ${app}/server.js)`);
