# Preparación del servidor (VPS Hostinger KVM 1, Ubuntu LTS limpio)

Guía para el titular, con Claude Code explicando cada comando antes de ejecutarlo (prompt inicial). **Nada de esto se ejecuta sin tu aprobación.**
Los builds NO se hacen en el servidor (decisión): se construyen en GitHub Actions y aquí solo se despliega el resultado (`config/deploy/README.md`).

Antes de empezar necesitas: la IP del servidor, acceso a `root` y el DNS de `tablemaroc.com` y `www` apuntando a esa IP (registros A). **Las contraseñas y claves nunca se pegan en el chat.**

## 1. Acceso seguro
1. Crea en tu equipo una clave SSH personal y copia al servidor solo la parte pública.
2. Crea el usuario `deploy` con tu clave pública en `~deploy/.ssh/authorized_keys`, y un segundo usuario tuyo con `sudo` para administrar.
3. **Sin cerrar la sesión actual**, comprueba en otra ventana que entras con la clave. Solo entonces desactiva la contraseña y el acceso de `root`: `PasswordAuthentication no` y `PermitRootLogin no` en `/etc/ssh/sshd_config`, y recarga SSH. Si te equivocas, la sesión abierta te permite corregirlo.
4. Actualiza el sistema y activa las actualizaciones de seguridad automáticas (`unattended-upgrades`).

## 2. Cortafuegos y protección
5. `ufw`: denegar todo por defecto y permitir solo `22/tcp` (SSH), `80/tcp` y `443/tcp`. Permite SSH **antes** de activarlo, o te quedarías fuera.
6. Instala `fail2ban` para limitar intentos de SSH.

## 3. Software
7. Node.js 26 (la versión de `.nvmrc`) en `/usr/bin/node`, `nginx`, `certbot` y `rsync`. Comprueba con `node -v`.
8. Directorios: `/srv/tablemaroc/releases` y `/srv/tablemaroc/scripts`, con dueño `deploy`.
9. Archivo de entorno `/etc/tablemaroc/app.env` (permisos `600`, dueño `deploy`; ver `config/env-templates/.env.example`). Los secretos los pones tú; no pasan por Git. Para el lanzamiento inicial deja vacíos `SITE_INDEXING_ENABLED` y `PUBLIC_SIGNUP_ENABLED`.
10. Copia `tablemaroc.sudoers.example` a `/etc/sudoers.d/tablemaroc` (permisos `440`) y compruébalo con `visudo -c`. Permite a `deploy` reiniciar la web y nada más.

## 4. HTTPS y Nginx
11. Con la página por defecto de Nginx aún activa, comprueba que `http://tablemaroc.com` responde desde fuera.
12. Obtén el certificado: `certbot certonly --webroot -w /var/www/html -d tablemaroc.com -d www.tablemaroc.com --deploy-hook "systemctl reload nginx"`. Se hace antes del paso siguiente porque la plantilla necesita que el certificado ya exista.
13. Copia `nginx.conf.example` a `/etc/nginx/sites-available/tablemaroc.com`, enlázalo en `sites-enabled`, quita el sitio `default`, comprueba con `nginx -t` y recarga.
14. Comprueba la renovación automática: `certbot renew --dry-run`.

## 5. Servicio y primer despliegue
15. Copia `tablemaroc.service.example` a `/etc/systemd/system/tablemaroc.service` y ejecuta `systemctl enable tablemaroc`. Aún no arrancará: falta la primera versión.
16. Configura GitHub (`config/deploy/README.md`) y lanza el despliegue a mano. Requiere tu aprobación expresa: es lo que publica la web.

## 6. Copias de seguridad
17. Sigue `config/backups/README.md` (base de datos diaria; fotos y configuración no secreta semanal).

## Verificación final
- `curl -I https://tablemaroc.com` → 200 y cabeceras de seguridad; `http://` y `www` redirigen a `https://tablemaroc.com`.
- `https://tablemaroc.com/robots.txt` bloquea todo mientras la indexación esté apagada.
- Subir en el panel una foto de cerca de 10 MB funciona (comprueba `client_max_body_size`).
- Entrar al panel con los dos pasos, y probar en un iPhone real y con Google Maps real (pendientes de la Fase 6).
- Auditoría con `ordenes-claude-code/seguridad-servidor/orden.md` antes del lanzamiento.
