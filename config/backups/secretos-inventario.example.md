# Inventario de secretos (solo nombres, NUNCA valores)

| Nombre | Dónde se guarda el valor | Quién lo gestiona | Última rotación |
|---|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | Gestor seguro del titular + `/etc/tablemaroc/app.env` | Titular | |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Gestor seguro del titular | Titular | |
| DEPLOY_SSH_KEY | Secretos de GitHub | Titular | |
| Clave privada de `age` (backups) | Gestor seguro del titular, fuera del servidor | Titular | |
