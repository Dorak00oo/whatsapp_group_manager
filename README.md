# Panel de directorio (WhatsApp / comunidad)

Aplicación web para gestionar un **directorio de personas** (gamertag, teléfono, situación en la comunidad, strikes y baneos). Incluye autenticación con una sola cuenta comunitaria, filtros por rol o situación e **importación masiva desde Excel o archivos exportados de Google Sheets**.

## Stack

- **Next.js** 16 (App Router), **React** 19, **TypeScript**
- **PostgreSQL** con **Prisma** 7 y adaptador `pg` (p. ej. [Neon](https://neon.tech))
- **Auth.js** (NextAuth v5) con proveedor **Credentials** (sin registro público)
- **Tailwind CSS** 4
- **SheetJS** (`xlsx`) para lectura de hojas de cálculo

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
   | `COMMUNITY_EMAIL` / `COMMUNITY_PASSWORD` | Única cuenta de acceso al panel |
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

## Funcionalidades del panel

- **Lista** (`/dashboard`): búsqueda, filtros por estado, país, cohortes (nuevos, activos, inactivos, se salieron, admins, protegidos, etc.).
- **Agregar** (`/dashboard/agregar`): alta manual y bloque **Importar desde Excel o Google Sheets**.
  - Formatos: `.xlsx`, `.xls`, `.csv`, `.tsv`.
  - Se procesan **todas las hojas** del libro que tengan cabeceras reconocibles (jugador + teléfono).
  - Plantillas: `GET /dashboard/agregar/plantilla` (Excel) y `?format=csv` (CSV).
  - Sin `+` en el número hace falta columna de **país** (ISO2, ej. `MX`) o número en formato internacional.
- **Minecraft** (`/dashboard/minecraft`): monitoreo en tiempo real de jugadores del servidor de Minecraft Bedrock.
  - Dashboard con estadísticas (activos, inactivos, blacklist, whitelist).
  - Recepción automática de datos cada hora desde el addon del servidor.
  - Historial de snapshots.
  - Ver [MINECRAFT.md](./MINECRAFT.md) para configuración completa.

## Despliegue en Vercel

1. Crea el proyecto en Vercel enlazado al mismo repositorio y rama que uses en desarrollo.
2. En **Settings → Environment Variables**, define al menos:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `COMMUNITY_EMAIL` y `COMMUNITY_PASSWORD`
   - Opcional: `AUTH_URL` con la URL pública del sitio si hiciera falta para el callback de auth.
3. En **Vercel → Settings → General → Build Command**, usa por ejemplo:

   ```bash
   npx prisma migrate deploy && npm run build
   ```

   Así cada despliegue aplica migraciones pendientes en Neon (p. ej. la columna `display_name` para nombre + gamertag). `npm run build` ya incluye `prisma generate`.

La sección de importación Excel está en **`/dashboard/agregar`**, debajo del formulario manual (no en la vista solo-lista).

### «El nombre es opcional, ¿por qué falla la importación?»

En la app el nombre es opcional, pero en PostgreSQL hace falta la **columna** `display_name` (puede ser NULL en todas las filas). Si el código nuevo se desplegó pero **no** ejecutaste `npx prisma migrate deploy` en esa base, cualquier alta (Excel o formulario) fallará hasta aplicar la migración.

## Documentación Next.js

- [Documentación Next.js](https://nextjs.org/docs)
- [Despliegue](https://nextjs.org/docs/app/building-your-application/deploying)
