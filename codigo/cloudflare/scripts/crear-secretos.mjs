#!/usr/bin/env node
// Crea los secretos del Worker en Cloudflare (maestro §2: los secretos los crea y guarda el TITULAR).
// Uso (lo ejecuta el titular en su terminal, desde codigo/cloudflare):   node scripts/crear-secretos.mjs
//
// Genera valores aleatorios fuertes, los MUESTRA UNA SOLA VEZ para que el titular los guarde en su gestor de contraseñas
// y los envía directamente a Cloudflare (wrangler secret put). No se escriben en ningún archivo ni en Git.
//   SESSION_PEPPER  sal de los hash de sesiones y códigos (si se cambia, todas las sesiones se cierran)
//   TOTP_KEY        cifra el secreto del segundo factor de administración (si se pierde, hay que volver a configurar la app)
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const secretos = {
  SESSION_PEPPER: randomBytes(32).toString('hex'),
  TOTP_KEY: randomBytes(32).toString('base64url'),
};

console.log('\nGuarda AHORA estos dos valores en tu gestor de contraseñas (no se vuelven a mostrar):\n');
for (const [nombre, valor] of Object.entries(secretos)) console.log(`  ${nombre} = ${valor}`);
console.log('\nEnviándolos a Cloudflare…\n');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let ok = true;
for (const [nombre, valor] of Object.entries(secretos)) {
  const r = spawnSync(npx, ['wrangler', 'secret', 'put', nombre], { input: valor, encoding: 'utf8', shell: process.platform === 'win32' });
  const bien = r.status === 0;
  ok &&= bien;
  console.log(`${bien ? '✔' : '✖'} ${nombre}${bien ? ' guardado en Cloudflare' : ': ' + (r.stderr || r.stdout).split('\n').slice(-5).join(' ')}`);
}
console.log(ok ? '\nListo. Ya puedes limpiar la pantalla de la terminal (cls).\n' : '\nAlgo ha fallado: no se ha guardado todo.\n');
process.exit(ok ? 0 : 1);
