# Integración con Minecraft

Este proyecto incluye integración con servidores de Minecraft Bedrock para monitorear la actividad de jugadores en tiempo real.

## Características

- Recepción automática de datos del servidor de Minecraft cada hora
- Dashboard visual con estadísticas en tiempo real
- Historial de actividad de jugadores
- Seguimiento de blacklist y whitelist
- Filtros por estado (activos, inactivos, baneos)
- API REST para consultar datos

## Configuración rápida

### 1. Aplicar migraciones

```bash
npx prisma migrate deploy
npx prisma generate
```

### 2. Variables de entorno

Agrega a tu `.env`:

```bash
MINECRAFT_API_KEY="genera-una-clave-segura"
```

Genera la clave:

```bash
openssl rand -base64 32
```

### 3. Configurar el addon de Minecraft

En el addon de Minecraft (`PlayerStatusBP/scripts/main.js`):

```javascript
const API_ENDPOINT = "https://tu-dominio.vercel.app/api/minecraft/status";
const API_KEY = "la-misma-clave-del-paso-2";
```

### 4. Ver el dashboard

Accede a: `https://tu-dominio.vercel.app/dashboard/minecraft`

## Endpoints disponibles

### POST /api/minecraft/status

Recibe actualizaciones del servidor de Minecraft (requiere autenticación con Bearer token).

### GET /api/minecraft/status

Consulta los datos actuales de jugadores (requiere autenticación con Bearer token).

## Despliegue en producción

### Vercel

1. Agrega la variable de entorno en Vercel:

```bash
vercel env add MINECRAFT_API_KEY
```

2. Asegúrate de ejecutar las migraciones en cada despliegue:

En **Settings → General → Build Command**:

```bash
npx prisma migrate deploy && npm run build
```

### Railway / Fly.io / Render

Similar a Vercel, asegúrate de:

1. Configurar `MINECRAFT_API_KEY` en las variables de entorno
2. Ejecutar `prisma migrate deploy` antes del build
3. Verificar que `DATABASE_URL` apunta a tu base Neon

## Modelos de datos

### MinecraftPlayer

Información actualizada de cada jugador:

```typescript
{
  id: string;
  gamertag: string;          // Nombre del jugador
  lastSeen: DateTime;        // Última conexión
  active: boolean;           // Activo (últimos 7 días)
  daysInactive: number;      // Días desde última conexión
  isBlacklisted: boolean;    // En lista negra (>14 días)
  isWhitelisted: boolean;    // Exento de blacklist automática
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### MinecraftSnapshot

Snapshots históricos (uno por hora):

```typescript
{
  id: string;
  timestamp: DateTime;
  totalPlayers: number;
  activePlayers: number;
  inactivePlayers: number;
  data: Json;               // Snapshot completo de todos los datos
  createdAt: DateTime;
}
```

## Dashboard web

El dashboard en `/dashboard/minecraft` muestra:

### Resumen del servidor

- Total de jugadores registrados
- Jugadores activos (últimos 7 días)
- Jugadores inactivos (8-21 días)
- Jugadores en blacklist

### Tabla de jugadores

Columnas:
- Gamertag
- Estado (activo/inactivo)
- Última conexión
- Días de inactividad
- Listas (blacklist/whitelist)

Filtros:
- Todos
- Activos
- Inactivos
- Blacklist
- Whitelist
- Búsqueda por gamertag

## Frecuencia de actualización

Por defecto, el addon exporta datos cada **1 hora** (72,000 ticks).

Para cambiar la frecuencia, edita en el addon:

```javascript
// 1 minuto (para pruebas)
const EXPORT_INTERVAL_TICKS = 1200;

// 10 minutos
const EXPORT_INTERVAL_TICKS = 12000;

// 1 hora (recomendado)
const EXPORT_INTERVAL_TICKS = 72000;

// 2 horas
const EXPORT_INTERVAL_TICKS = 144000;
```

## Exportación manual

Desde la consola del servidor de Minecraft:

```
scriptevent playerstatus:export
```

## Seguridad

- El endpoint está protegido con autenticación Bearer token
- La clave debe ser única y secreta
- Usa HTTPS en producción (Vercel/Railway lo proporcionan automáticamente)
- Nunca compartas el archivo `.env`

## Troubleshooting

### No se reciben datos

1. Verifica los logs del servidor de Minecraft
2. Comprueba que `MINECRAFT_API_KEY` coincide en ambos lados
3. Verifica que el addon tenga acceso a red (`@minecraft/server-net`)

### Error 401 Unauthorized

La `API_KEY` en el addon no coincide con `MINECRAFT_API_KEY` en el servidor web.

### Error 503 Service Unavailable

`MINECRAFT_API_KEY` no está configurada en las variables de entorno del servidor web.

### Página en blanco

1. Verifica que aplicaste las migraciones: `npx prisma migrate deploy`
2. Regenera el cliente: `npx prisma generate`
3. Reinicia el servidor de desarrollo

## Documentación completa

Ver `INTEGRACION.md` en la carpeta del addon de Minecraft para instrucciones detalladas.
