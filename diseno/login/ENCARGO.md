# Encargo para Claude Design · Login

**Proyecto:** Tablemaroc, guía de restaurantes de Marruecos para turistas europeos (es · en · fr; el español es el idioma base).
**Autoridad:** `docs/01-documento-maestro-operacion.md` (§18) y `docs/16-encargo-claude-design.md` (reglas generales).
**Bocetos adjuntos:** tres carpetas, cada una con `movil/` (900 × 2000 px) y `ordenador/` (1280 × 760 px). Son esquemas de
estructura en grises con datos ficticios: diseña el aspecto final respetando la estructura, los textos y el orden de los elementos.

| Carpeta | Para quién | Pantallas |
|---|---|---|
| `usuarios/` | Turistas que usan la web | 9 |
| `administrador/` | Administración de Tablemaroc | 3 |
| `propietario/` | Propietarios y empleados de los restaurantes | 5 |

**Total: 17 pantallas × 2 (móvil y ordenador) = 34 imágenes.**

---

## 1. Reglas comunes a las tres carpetas

- **Sin contraseñas, sin SMS, sin teléfono y sin login con Apple.** No existe «recuperar contraseña».
- Formas de entrar, siempre con el mismo peso visual entre ellas:
  - **Continuar con Google**
  - **✉️ Continuar con email** (se recibe un código de 6 cifras)
  - **🔑 Continuar con huella o cara** (passkey del dispositivo). Se llama siempre así, nunca «passkey».
- **Una sola pantalla**, sin scroll, en móvil y en ordenador. En ordenador, el formulario va centrado y con ancho limitado.
- El botón principal (relleno) es solo la acción final de cada pantalla («Entrar», «Crear cuenta», «Enviarme un código»).
- Campos preparados para que el navegador y el gestor del móvil autocompleten el email y el código.
- Diseñar también los **mensajes de error**: código incorrecto, código caducado, demasiados intentos, email no válido,
  huella o cara cancelada.
- Textos en español; los tres idiomas deben caber (el francés ocupa un 20–30 % más).
- Accesibilidad: contraste mínimo WCAG AA, foco visible, áreas táctiles de 44 × 44 px, etiquetas en todos los campos.

---

## 2. `usuarios/` · Login de la web (9 pantallas)

Llevan la cabecera de la web (logo, buscar, idioma, cuenta) y, en móvil, la barra inferior con «Cuenta» activa.

| # | Archivo | Pantalla | Contenido |
|---|---|---|---|
| 01 | `01-entrar` | Entrar | Título «Entrar», «Sin contraseñas. Elige cómo quieres entrar:», los 3 botones y, debajo, «¿No tienes cuenta?» con el botón principal **«Crear cuenta»** |
| 02 | `02-continuar-con-email` | Continuar con email | Campo email, «Enviarme un código», aviso del código de 6 cifras, campo código, «Entrar», «‹ Otras opciones» |
| 03 | `03-continuar-con-google` | Continuar con Google | Elegir cuenta o «Usar otra cuenta de Google», «Entrar», aviso de datos compartidos y de que nunca vemos la contraseña de Google, «‹ Otras opciones» |
| 04 | `04-continuar-con-huella-o-cara` | Continuar con huella o cara | Icono de llave, «Usar huella o cara», «Tu huella o tu cara nunca salen de tu dispositivo», cómo activarlo, «‹ Otras opciones» |
| 05 | `05-crear-cuenta` | Crear cuenta | «Nombre visible», «Elige cómo quieres crearla:» con tres opciones a elegir (Con Google · Con email · Con huella o cara; una marcada), casilla de condiciones y privacidad, **botón principal «Crear cuenta»** y «‹ Ya tengo cuenta: entrar». Al pulsar «Crear cuenta» se sigue el paso del método elegido (código por email, ventana de Google o huella o cara) |
| 06 | `06-crear-con-google-1` | Crear con Google · elegir cuenta | Ventana de Google sobre «Crear cuenta» (fondo atenuado) |
| 07 | `07-crear-con-google-2` | Crear con Google · último paso | «Has entrado con Google como …», «Nombre visible», casilla de condiciones, «Crear cuenta» |
| 08 | `08-crear-con-huella-o-cara-1` | Crear con huella o cara · datos | «Nombre visible», «Email (para recuperar la cuenta)», casilla de condiciones, «Activar huella o cara» |
| 09 | `09-crear-con-huella-o-cara-2` | Crear con huella o cara · confirmación | Ventana del sistema del dispositivo (fondo atenuado), «Cancelar» y «Continuar». Solo representarla, no rediseñarla |

---

## 3. `administrador/` · Acceso de la administración (3 pantallas)

Sin cabecera ni barra de la web. Fondo neutro y tarjeta centrada. Solo cuentas autorizadas.

| # | Archivo | Pantalla | Contenido |
|---|---|---|---|
| 01 | `01-acceso` | Acceso | «Tablemaroc · Administración», **solo dos opciones**: «Continuar con Google» y «Continuar con huella o cara». Nota: con Google se pide después el código de la app; con huella o cara no |
| 02 | `02-codigo-app` | Segundo paso | «Has entrado con Google como …», campo «Código de la app» (6 cifras), «Entrar», «‹ Otras opciones» |
| 03 | `03-no-autorizado` | Acceso no autorizado | La cuenta no tiene acceso a la administración; botón «Ir al panel de locales» y «‹ Probar con otra cuenta» |

---

## 4. `propietario/` · Acceso de propietarios y empleados (5 pantallas)

Sin cabecera ni barra de la web. Fondo neutro y tarjeta centrada. Mismo acceso para propietarios y empleados; el sistema
reconoce el rol (el empleado solo verá las reservas de su local).

| # | Archivo | Pantalla | Contenido |
|---|---|---|---|
| 01 | `01-acceso` | Acceso | «Tablemaroc · Panel de locales», los 3 botones, nota «¿Es tu primera vez? Activa tu acceso desde el email que te enviamos» |
| 02 | `02-continuar-con-email` | Continuar con email | Igual que la de usuarios, en el estilo del panel |
| 03 | `03-continuar-con-google` | Continuar con Google | Igual que la de usuarios, en el estilo del panel |
| 04 | `04-continuar-con-huella-o-cara` | Continuar con huella o cara | Igual que la de usuarios, en el estilo del panel |
| 05 | `05-activar-acceso` | Activa tu acceso | Primera vez, desde el email recibido: local y rol (Propietario o Empleado), «Tu nombre», «Activar con Google / email / huella o cara», casilla de condiciones. Nunca se usa la palabra «invitar» |

---

## 5. Entregables

Las 17 pantallas en móvil y ordenador con el diseño final, los mensajes de error y los componentes que usan
(botón principal, botón secundario, campo de texto, campo de código, casilla, enlace, aviso, tarjeta de acceso del panel).
