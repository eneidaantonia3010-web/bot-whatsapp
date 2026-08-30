# 🚨 Production Operations Runbook & Incident Response Manual

> **System:** Glow Studio by Sofia  
> **Classification:** Confidential / Internal Engineering Runbook  
> **Version:** 2.0.0  
> **Last Verification:** 2026-08-30  

Este manual operativo describe los procedimientos de contingencia, mitigación de incidentes, rotación de secretos y recuperación ante desastres (Disaster Recovery) para los servicios en producción de Glow Studio.

---

## 📑 Tabla de Contenidos
1. [Matriz de Severidad, SLAs y Escalación](#1-matriz-de-severidad-slas-y-escalación)
2. [Procedimientos de Soporte y Re-vinculación de WhatsApp](#2-procedimientos-de-soporte-y-re-vinculación-de-whatsapp)
   - [2.1 Vinculación por Código QR en Vivo](#21-vinculación-por-código-qr-en-vivo)
   - [2.2 Vinculación por Pairing Code de 8 Dígitos](#22-vinculación-por-pairing-code-de-8-dígitos)
   - [2.3 Recuperación de Sesión Corrupta o Deslogueada](#23-recuperación-de-sesión-corrupta-o-deslogueada)
3. [Gestión de Servicios en Render (Protocolo Multi-Cuenta)](#3-gestión-de-servicios-en-render-protocolo-multi-cuenta)
   - [3.1 Mapeo de Cuentas Obligatorio](#31-mapeo-de-cuentas-obligatorio)
   - [3.2 Reinicio Manual y Redeploy de Servicios](#32-reinicio-manual-y-redeploy-de-servicios)
   - [3.3 Monitoreo de Cold Starts y UptimeRobot](#33-monitoreo-de-cold-starts-y-uptimerobot)
4. [Protocolos de Rotación de Secretos y Claves API](#4-protocolos-de-rotación-de-secretos-y-claves-api)
   - [4.1 Rotación de JWT_SECRET](#41-rotación-de-jwt_secret)
   - [4.2 Rotación de Clave Interna API_SECRET_KEY / BOT_API_KEY](#42-rotación-de-clave-interna-api_secret_key--bot_api_key)
   - [4.3 Rotación de Claves Groq Cloud](#43-rotación-de-claves-groq-cloud)
   - [4.4 Renovación de Tokens de Meta (Instagram Webhook)](#44-renovación-de-tokens-de-meta-instagram-webhook)
   - [4.5 Rotación de Cuenta de Servicio Google Calendar](#45-rotación-de-cuenta-de-servicio-google-calendar)
5. [Disaster Recovery y Operaciones de Base de Datos (Neon Postgres)](#5-disaster-recovery-y-operaciones-de-base-de-datos-neon-postgres)
   - [5.1 Point-in-Time Recovery (PITR) y Branching en Neon](#51-point-in-time-recovery-pitr-y-branching-en-neon)
   - [5.2 Backup Manual y Restauración (pg_dump / psql)](#52-backup-manual-y-restauración-pg_dump--psql)
   - [5.3 Desbloqueo de Conexiones y Saturación de Pool](#53-desbloqueo-de-conexiones-y-saturación-de-pool)
   - [5.4 Reversión de Migraciones de Prisma](#54-reversión-de-migraciones-de-prisma)

---

## 1. Matriz de Severidad, SLAs y Escalación

| Nivel de Severidad | Definición y Ejemplos | SLA de Respuesta | SLA de Resolución | Canal de Notificación |
|---|---|---|---|---|
| **S1 (Crítico)** | • Caída total del backend o base de datos Neon.<br>• Desconexión de WhatsApp que no reconecta tras 15 minutos.<br>• Imposibilidad absoluta de reservar turnos en Web y WhatsApp. | **< 15 minutos** | **< 2 horas** | WhatsApp Tech Lead + Alerta de UptimeRobot |
| **S2 (Mayor)** | • Fallos intermitentes en la inferencia de IA (Groq Cloud).<br>• Fallo de sincronización con Google Calendar (citas se guardan en DB pero no en GCal).<br>• Webhook de Instagram devuelve HTTP 500. | **< 45 minutos** | **< 6 horas** | Canal de Incidentes Slack / Telegram |
| **S3 (Menor)** | • Degradación en la velocidad de respuesta del bot (>5s).<br>• Error cosmético en el dashboard administrativo o exportación CSV. | **< 4 horas** | **< 24 horas** | Ticket en GitHub Issues |

---

## 2. Procedimientos de Soporte y Re-vinculación de WhatsApp

El servicio de WhatsApp se ejecuta de forma embebida en `apps/api` utilizando `@whiskeysockets/baileys` con persistencia en la tabla `baileys_sessions` de PostgreSQL.

### 2.1 Vinculación por Código QR en Vivo

Si la sesión no existe o fue desvinculada desde el teléfono del salón, el backend genera un nuevo código QR dinámico.

```mermaid
flowchart LR
    A[Administrador abre /admin] --> B[GET /api/whatsapp-admin/status]
    B --> C{¿Estado = 'open'?}
    C -- Sí --> D[Muestra Estado Activo 🟢]
    C -- No --> E[GET /api/whatsapp-admin/qr]
    E --> F[Renderiza QR Base64 en Pantalla]
    F --> G[Admin escanea con WhatsApp en su celular]
    G --> H[Socket pasa a 'open' y guarda credenciales en Neon DB]
```

#### Pasos Operativos:
1. Acceder al panel de administración: `https://glow-studio-web.onrender.com/admin` (o localhost:3000/admin).
2. Iniciar sesión con credenciales de Administrador.
3. Navegar a la pestaña **WhatsApp**.
4. Si el estado indica `Desconectado` o `connecting`:
   - Visualizar el código QR renderizado en pantalla.
   - En el teléfono del salón (+54 9 11 7829-6781), abrir WhatsApp > **Dispositivos Vinculados** > **Vincular un dispositivo**.
   - Escanear el código QR.
5. Una vez escaneado, la pantalla actualizará el estado a `🟢 Conectado` automáticamente vía polling o Server-Sent Events.

---

### 2.2 Vinculación por Pairing Code de 8 Dígitos

En situaciones donde no es posible usar la cámara del teléfono o se requiere vinculación remota:

#### Procedimiento por API cURL:
```bash
curl -X POST https://glow-studio-api-2vzt.onrender.com/api/whatsapp-admin/pairing-code \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "5491178296781"}'
```

#### Respuesta esperada:
```json
{
  "success": true,
  "pairingCode": "ABCD-1234",
  "message": "Introduce este código de 8 dígitos en tu teléfono WhatsApp > Dispositivos vinculados > Vincular con número de teléfono"
}
```

---

### 2.3 Recuperación de Sesión Corrupta o Deslogueada

Si el socket entra en un ciclo infinito de errores `DisconnectReason.loggedOut` o claves corruptas:

#### Procedimiento de Purga y Reinicio de Sesión:
1. Ejecutar el endpoint de logout forzado:
```bash
curl -X POST https://glow-studio-api-2vzt.onrender.com/api/whatsapp-admin/logout \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

2. Si la API no responde, conectar a la base de datos Neon vía `psql` y purgar la tabla de sesiones:
```sql
-- Purgar credenciales corruptas
DELETE FROM baileys_sessions;
```

3. Reiniciar el servicio `glow-studio-api` en Render (ver Sección 3). El backend generará automáticamente un nuevo par de credenciales y un QR limpio al arrancar.

---

## 3. Gestión de Servicios en Render (Protocolo Multi-Cuenta)

> [!CAUTION]
> **PROTOCOLO OBLIGATORIO DE CUENTAS RENDER (ESTRICTO):**  
> Para maximizar las 750 horas mensuales de Free Tier en cada servicio, la infraestructura está distribuida en tres cuentas de correo separadas conectadas al repositorio `eneidaantonia3010-web/bot-whatsapp`. **NUNCA ingresar a una cuenta equivocada.**

### 3.1 Mapeo de Cuentas Obligatorio

| Componente | Servicio en Render | Correo de Acceso Render | URL Pública |
|---|---|---|---|
| **Frontend Web** | `glow-studio-web` | `eneidaantonia3010@gmail.com` | `https://glow-studio-web.onrender.com` |
| **Backend API** | `glow-studio-api` | `restrepojivana7@gmail.com` | `https://glow-studio-api-2vzt.onrender.com` |
| **Bot de IA** | `glow-studio-bot` | `superfruitas301083@gmail.com` | `https://glow-studio-bot-alrb.onrender.com` |

---

### 3.2 Reinicio Manual y Redeploy de Servicios

Cuando sea necesario aplicar cambios urgentes o liberar memoria RAM:

1. Iniciar sesión en [dashboard.render.com](https://dashboard.render.com) con el correo específico del servicio indicado en la tabla anterior.
2. Seleccionar el servicio Web correspondiente.
3. Hacer clic en el botón superior **Manual Deploy**:
   - **Clear build cache & deploy:** Usar si hay cambios de dependencias en `package.json` o `requirements.txt`.
   - **Deploy latest commit:** Usar si solo se desea forzar el despliegue del último commit de `main`.
4. Para un reinicio rápido sin recompilar: Hacer clic en **Settings** > **Restart Service**.

---

### 3.3 Monitoreo de Cold Starts y UptimeRobot

Los servicios gratuitos de Render entran en suspensión tras 15 minutos sin tráfico entrante.

- **UptimeRobot Configuración:**
  - Monitor 1: `https://glow-studio-web.onrender.com` (Intervalo: cada 5 minutos, tipo HTTP HEAD).
  - Monitor 2: `https://glow-studio-api-2vzt.onrender.com/api/health` (Intervalo: cada 5 minutos, tipo HTTP GET).
  - Monitor 3: `https://glow-studio-bot-alrb.onrender.com/health` (Intervalo: cada 5 minutos, tipo HTTP GET).
- Si un monitor reporta estado `DOWN` por más de 10 minutos, ejecutar el protocolo S1 de reinicio.

---

## 4. Protocolos de Rotación de Secretos y Claves API

### 4.1 Rotación de JWT_SECRET

El `JWT_SECRET` cifra los tokens de sesión de administradores y personal del salón.

1. Generar un nuevo secreto criptográfico seguro de al menos 32 caracteres:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
2. Ingresar a la **Cuenta 2** de Render (`restrepojivana7@gmail.com`) > `glow-studio-api` > **Environment**.
3. Actualizar la variable `JWT_SECRET` con el nuevo valor.
4. Hacer clic en **Save Changes**. El servicio se reiniciará automáticamente.
5. Notificar a los administradores activos que deberán volver a iniciar sesión en `/admin/login`.

---

### 4.2 Rotación de Clave Interna API_SECRET_KEY / BOT_API_KEY

Esta clave asegura la comunicación mutua entre `glow-studio-api` (Express) y `glow-studio-bot` (FastAPI).

1. Generar la nueva clave alfanumérica segura.
2. En la **Cuenta 2** (`glow-studio-api`): Actualizar `API_SECRET_KEY`.
3. En la **Cuenta 3** (`superfruitas301083@gmail.com` -> `glow-studio-bot`): Actualizar `BOT_API_KEY` y `API_SECRET_KEY` con el **mismo valor exacto**.
4. Guardar los cambios en ambos servicios para que se reinicien sincronizados.

---

### 4.3 Rotación de Claves Groq Cloud

1. Acceder a [console.groq.com](https://console.groq.com/keys).
2. Crear una nueva API Key (ej. `gsk_...`).
3. En la **Cuenta 3** de Render (`glow-studio-bot`):
   - Actualizar `GROQ_API_KEY`. Se pueden definir múltiples claves separadas por coma (ej: `gsk_key1,gsk_key2`) para balanceo y redundancia.
4. Guardar cambios y verificar el endpoint `/health` del bot.

---

### 4.4 Renovación de Tokens de Meta (Instagram Webhook)

1. Acceder a [developers.facebook.com](https://developers.facebook.com/).
2. En la sección **Graph API Explorer**, generar un nuevo *Page Access Token* con permisos `instagram_basic`, `instagram_manage_messages` y duración permanente (Long-Lived Token).
3. En la **Cuenta 2** (`glow-studio-api`): Actualizar `META_PAGE_ACCESS_TOKEN`.
4. Si se cambia el token de verificación de webhooks, actualizar `WEBHOOK_VERIFY_TOKEN` tanto en Render como en la configuración del Webhook en Meta Developer Dashboard.

---

### 4.5 Rotación de Cuenta de Servicio Google Calendar

1. En [Google Cloud Console](https://console.cloud.google.com/), ir a **IAM & Admin** > **Service Accounts**.
2. Seleccionar la cuenta de servicio de Glow Studio > Pestaña **Keys** > **Add Key** > **Create new key** (JSON).
3. Descargar el archivo JSON, minificar su contenido en una sola línea.
4. En la **Cuenta 2** (`glow-studio-api`): Actualizar `GOOGLE_CREDENTIALS` con la cadena JSON minificada completa.
5. Asegurar que el calendario de Google en `GOOGLE_CALENDAR_ID` tenga concedidos permisos de edición al email `client_email` de la nueva cuenta de servicio.

---

## 5. Disaster Recovery y Operaciones de Base de Datos (Neon Postgres)

### 5.1 Point-in-Time Recovery (PITR) y Branching en Neon

Neon PostgreSQL permite restaurar el estado completo de la base de datos a cualquier segundo del pasado reciente.

```mermaid
flowchart TD
    A[🚨 Incidente: Corrupción de Datos o Borrado Accidental] --> B[Ingresar a console.neon.tech]
    B --> C[Seleccionar Proyecto: glow-studio]
    C --> D[Crear nuevo Branch con Point-in-Time: Especificar Fecha y Hora previa al incidente]
    D --> E[Obtener Connection String del nuevo Branch restaurado]
    E --> F[Actualizar DATABASE_URL en Cuentas 2 y 3 de Render]
    F --> G[Sistema vuelve a operar con datos íntegros]
```

---

### 5.2 Backup Manual y Restauración (pg_dump / psql)

#### Crear un Backup Lógico Completo:
```bash
# Exportar esquema y datos comprimidos
pg_dump "postgres://user:password@ep-xyz.neon.tech/glow_studio?sslmode=require" \
  -F c -b -v -f "backup_glow_studio_$(date +%Y%m%d_%H%M%S).dump"
```

#### Restaurar sobre una Base de Datos Limpia:
```bash
pg_restore -d "postgres://user:password@ep-xyz.neon.tech/glow_studio?sslmode=require" \
  -v --clean --no-owner "backup_glow_studio_20260830.dump"
```

---

### 5.3 Desbloqueo de Conexiones y Saturación de Pool

Si la base de datos arroja el error `FATAL: remaining connection slots are reserved for non-replication superuser connections`:

1. Conectar como administrador mediante la URL directa sin pooler:
```sql
-- Ver conexiones activas por aplicación
SELECT pid, usename, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE datname = 'glow_studio';

-- Terminar conexiones inactivas colgadas (Idle connections)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'glow_studio' 
  AND state = 'idle' 
  AND query_start < NOW() - INTERVAL '5 minutes';
```

2. Verificar que `apps/api` utilice el endpoint con PgBouncer (`-pooler` en el host de Neon) en la variable `DATABASE_URL`.

---

### 5.4 Reversión de Migraciones de Prisma

Si un despliegue reciente introdujo una migración fallida en el esquema de la base de datos:

```bash
# 1. Comprobar el estado de las migraciones
npx prisma migrate status

# 2. Si se requiere resolver una migración fallida
npx prisma migrate resolve --rolled-back "20260830_nombre_migracion"

# 3. Forzar sincronización controlada en entorno de rescate
npx prisma db push
```

---

*Fin del manual de operaciones y soporte en producción.*
