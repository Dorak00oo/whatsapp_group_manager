# Panel de directorio (WhatsApp / comunidad)

Aplicación web para gestionar un **directorio de personas** (gamertag, teléfono, situación en la comunidad, strikes y baneos). Incluye acceso por gamertag para los admins (ver [Entrar al panel y cuentas](#entrar-al-panel-y-cuentas)), historial de cambios, filtros por rol o situación e **importación y exportación CSV**.

## Stack

- **Next.js** 16 (App Router), **React** 19, **TypeScript**
- **PostgreSQL** con **Prisma** 7 y adaptador `pg` (p. ej. [Neon](https://neon.tech))
- **Auth.js** (NextAuth v5) con proveedor **Credentials** (sin registro público)
- **Tailwind CSS** 4

## Requisitos

- Node.js 20+
- Una base PostgreSQL accesible (cadena `DATABASE_URL`)

## Configuración local

1. Clona el repositorio e instala dependencias:

   ```bash
   npm install
   ```

2. Copia variables de entorno y rellénalas:

   ```bash
   cp .env.example .env
   ```

   Variables importantes (ver comentarios en `.env.example`):

   | Variable | Descripción |
   |----------|-------------|
   | `DATABASE_URL` | URL `postgresql://…` (Neon u otro Postgres) |
   | `AUTH_SECRET` | Secreto para sesiones (`openssl rand -base64 32`) |
   | `COMMUNITY_EMAIL` | Identifica la fila `User` dueña del directorio. Ya no se escribe al entrar; no lo cambies en producción |
   | `COMMUNITY_PASSWORD` | Contraseña grupal: la usan las cuentas de admin junto con su gamertag |
   | `PANEL_OWNER_GAMERTAG` | Dueño del panel (por defecto `Drako274`) |
   | `PANEL_OWNER_PASSWORD` | Contraseña propia del dueño. Sin ella el dueño no puede entrar |
   | `AUTH_URL` | Origen completo en local si no usas el puerto 3000 (ej. `http://localhost:3001`) |

3. Aplica migraciones y regenera el cliente Prisma (obligatorio tras `git pull` si cambió `prisma/schema.prisma`):

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   Si ves `Unknown argument displayName` (u otro campo nuevo) al importar o guardar, el cliente está desfasado: ejecuta `npx prisma generate` y reinicia `npm run dev`.

4. Arranca el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000), inicia sesión y entra a **Panel → Lista de personas** o **Agregar persona**.

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run start` | Servidor tras `build` |
| `npm run lint` | ESLint |

`postinstall` ejecuta `prisma generate` (el cliente se genera en `src/generated/prisma`, ignorado en git).

## Entrar al panel y cuentas

- **Login** (`/login`): gamertag + contraseña.
  - El dueño (`PANEL_OWNER_GAMERTAG`, por defecto Drako274) entra solo con `PANEL_OWNER_PASSWORD`; la contraseña grupal no le sirve.
  - Cualquier otro gamertag necesita una **cuenta del panel** y entra con `COMMUNITY_PASSWORD`.
  - Las mayúsculas del gamertag no importan. Si el gamertag no tiene cuenta o la contraseña no es la suya, el mensaje es el mismo, «Gamertag o contraseña incorrectos.», para no revelar qué cuentas existen.
  - Límite en memoria del proceso: 5 fallos por IP o 10 por gamertag en 15 min bloquean 15 min. La IP sale de `cf-connecting-ip`, luego `x-forwarded-for`, luego `x-real-ip`. Reiniciar el contenedor borra los contadores.
- **Cuentas e historial** (`/dashboard/cuentas`):
  - **Historial** (lo ven todas las cuentas): quién hizo qué, sobre quién y cuándo, desde el panel, el bot de WhatsApp o el sistema. Filtros por miembro, por quién lo hizo y por acción; 50 por página. Desde *Editar* de un miembro, **Ver historial** abre `?member=<id>`.
  - **Cuentas** (solo el dueño, validado en el servidor): buscar miembros del directorio que siguen en la comunidad, darles cuenta o quitarla. Cada alta o baja queda en el historial.
- **Sesiones**: duran 30 días, pero se revalidan en cada petición. Quitar una cuenta cierra su sesión en su siguiente clic (cuando es el mismo proceso, al instante; si no, en ≤ 3 s). Cambiar `COMMUNITY_PASSWORD` cierra las sesiones de todas las cuentas; cambiar `PANEL_OWNER_PASSWORD`, las del dueño. Las sesiones de antes de este cambio (con email) piden entrar de nuevo.
- Para registrar eventos desde otros módulos: `recordAuditEvent()` en `src/lib/audit-log.ts` (nunca lanza; si falla solo deja `console.error`) y `getPanelActor()` en `src/lib/panel-session.ts` para el actor del panel.

## Funcionalidades del panel

- **Lista** (`/dashboard`): búsqueda, filtros por estado, país, cohortes (nuevos, activos, inactivos, se salieron, admins, protegidos, etc.). Edad opcional en la tarjeta y en editar. Notas que eran solo la edad (`18`, `18 años`) pasan a esa columna al aplicar la migración.
- **Agregar** (`/dashboard/agregar`): alta manual (gamertag, nombre, **edad**, celular o @usuario) y, al final, **Importar y exportar (CSV)**.
  - **Exportar CSV** (`GET /dashboard/agregar/exportar`): todo el directorio, UTF-8 con BOM y separador coma.
  - **Descargar plantilla** (`GET /dashboard/agregar/plantilla`): las mismas columnas, vacía.
  - **Importar CSV**: coma o punto y coma. Quien ya esté (mismo teléfono, @usuario o gamertag) se salta y se lista; no se pisa. Las altas nuevas quedan protegidas 5 días.
  - Columnas: gamertag, nombre, teléfono, país, usuario de WhatsApp, edad, situación (`activo`, `inactivo`, `permanente`, `ausente`, `se_salio`), activo, causa de ausencia, admin, protegido (sin ban), activo permanente, baneado, motivo del ban y notas.
  - Sin `+` en el número hace falta la columna de **país** (ISO2, ej. `MX`).
- **Minecraft** (`/dashboard/minecraft`, parcela, monitoreo, comandos, **ajustes**): dos mundos Bedrock (Vanilla y Mods).
  - El selector cambia roster, parcelas, monitoreo y comandos del mundo elegido.
  - Ajustes: conexión en vivo de los dos BDS (asignar o **borrar** el UUID si cambiás el mundo), umbrales e ítems baneados del mundo seleccionado. **Sincronizar ajustes** empuja esa config al addon.
  - **Sincronizar listas** está en Jugadores → Listas (blacklist/whitelist del mundo elegido). La blacklist automática por inactividad la decide el **panel** (`daysBlacklist`); el addon no re-banea a quien desbaneaste en la web. Cómo copiar el addon: [MINECRAFT.md](./MINECRAFT.md).

## Migrar la base Neon → Supabase

Guía ordenada (**primero datos y migraciones contra Supabase, después cambio de `DATABASE_URL`** en cada entorno): [docs/MIGRACION-NEON-SUPABASE.md](./docs/MIGRACION-NEON-SUPABASE.md).

## Despliegue en Vercel

1. Crea el proyecto en Vercel enlazado al mismo repositorio y rama que uses en desarrollo.
2. En **Settings → Environment Variables**, define al menos:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `COMMUNITY_EMAIL` y `COMMUNITY_PASSWORD`
   - `PANEL_OWNER_PASSWORD` (y `PANEL_OWNER_GAMERTAG` si el dueño no es Drako274)
   - Opcional: `AUTH_URL` con la URL pública del sitio si hiciera falta para el callback de auth.
3. En **Vercel → Settings → General → Build Command**, usa por ejemplo:

   ```bash
   npx prisma migrate deploy && npm run build
   ```

   Así cada despliegue aplica migraciones pendientes en Neon (p. ej. la columna `display_name` para nombre + gamertag). `npm run build` ya incluye `prisma generate`.

La sección de CSV está en **`/dashboard/agregar`**, debajo del formulario manual.

### «El nombre es opcional, ¿por qué falla la importación?»

En la app el nombre es opcional, pero en PostgreSQL hace falta la **columna** `display_name` (puede ser NULL en todas las filas). Si el código nuevo se desplegó pero **no** ejecutaste `npx prisma migrate deploy` en esa base, cualquier alta (CSV o formulario) fallará hasta aplicar la migración.

## Documentación Next.js

- [Documentación Next.js](https://nextjs.org/docs)
- [Despliegue](https://nextjs.org/docs/app/building-your-application/deploying)
