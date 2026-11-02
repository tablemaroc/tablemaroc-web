# Despliegue

Principios (maestro): **nada se publica sin aprobación del titular**; los builds se hacen en CI o en local, no en el servidor; los secretos no están en Git.

El flujo es `.github/workflows/deploy.yml`:
1. El titular lo lanza a mano: GitHub > Actions > deploy > Run workflow, sobre `main`. Subir commits nunca publica nada.
2. GitHub instala dependencias, busca secretos, ejecuta tipos y pruebas, y construye en Linux con `npm run release` (crea `build-output/`).
3. Sube el resultado por SSH a `/srv/tablemaroc/releases/<commit>` y cambia el enlace `current` (despliegue atómico).
4. Reinicia el servicio y comprueba que responde; si falla en 30 s, reapunta `current` a la versión anterior y el despliegue queda en rojo.
5. Conserva las últimas 5 versiones desplegadas (solo artefactos de build, nunca contenido).

**No construir en Windows para subir al servidor:** sharp incluye un binario por sistema y el de Windows no funciona en Linux.

## Qué configurar en GitHub (Settings > Secrets and variables > Actions)

Los crea el titular. No se guardan en el repositorio.

| Tipo | Nombre | Qué es |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | Clave privada creada solo para desplegar (no la personal) |
| Secret | `DEPLOY_HOST` | IP o dominio del servidor |
| Secret | `DEPLOY_USER` | `deploy` |
| Secret | `DEPLOY_KNOWN_HOSTS` | Huella del servidor, para no conectar con uno falso |
| Variable | `NEXT_PUBLIC_SITE_URL` | `https://tablemaroc.com` |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| Variable | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave restringida por dominio |

Las `NEXT_PUBLIC_` son públicas (llegan al navegador) y se graban al construir: si cambian, hay que desplegar otra vez.
Las demás variables de la web van en `/etc/tablemaroc/app.env`; cambiarlas solo exige reiniciar el servicio. **Nunca** poner `SUPABASE_SERVICE_ROLE_KEY` en GitHub.

Conviene crear el entorno `production` en Settings > Environments y añadir al titular como revisor. Si el plan de GitHub no lo permite en un repositorio privado, el flujo sigue funcionando: solo se lanza a mano.

## Volver atrás a mano

Desde el servidor, como `deploy`: `ls -1dt /srv/tablemaroc/releases/*`, luego `ln -sfn /srv/tablemaroc/releases/<commit> /srv/tablemaroc/current` y `sudo /usr/bin/systemctl restart tablemaroc`.
Volver atrás la web no deshace migraciones: los cambios de base de datos se aplican aparte, con `codigo/database/apply.sh` y aprobación del titular, antes de desplegar el código que los necesita.

El Service Worker recibe su `VERSION` del commit al construir (`prepare-sw.mjs`): no hay que subirla a mano.
