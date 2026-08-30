# 📡 REST API Technical Specification & Contract Catalogue

> **Platform:** Glow Studio by Sofia  
> **API Version:** 1.0.0 (Express Core Backend & Python AI Bot)  
> **Base URLs:**
> - **Production API:** `https://glow-studio-api-2vzt.onrender.com`
> - **Production AI Bot:** `https://glow-studio-bot-alrb.onrender.com`
> - **Local Development API:** `http://localhost:3001`
> - **Local Development AI Bot:** `http://localhost:8000`

---

## 📑 Tabla de Contenidos
1. [Esquemas de Autenticación y Cabeceras Globales](#1-esquemas-de-autenticación-y-cabeceras-globales)
2. [Códigos de Estado HTTP y Envolvente de Errores](#2-códigos-de-estado-http-y-envolvente-de-errores)
3. [Catálogo de Endpoints de Core API (Express)](#3-catálogo-de-endpoints-de-core-api-express)
   - [3.1 Salud y Estado del Sistema](#31-salud-y-estado-del-sistema)
   - [3.2 Autenticación y Sesión](#32-autenticación-y-sesión)
   - [3.3 Gestión de Turnos (Appointments)](#33-gestión-de-turnos-appointments)
   - [3.4 Catálogo de Servicios](#34-catálogo-de-servicios)
   - [3.5 Clientes (Customers)](#35-clientes-customers)
   - [3.6 Equipo y Estilistas (Staff)](#36-equipo-y-estilistas-staff)
   - [3.7 Horarios Bloqueados (Blocked Times)](#37-horarios-bloqueados-blocked-times)
   - [3.8 Lista de Espera (Waitlist)](#38-lista-de-espera-waitlist)
   - [3.9 Administración de WhatsApp Nativo (Baileys)](#39-administración-de-whatsapp-nativo-baileys)
   - [3.10 Eventos en Tiempo Real (SSE)](#310-eventos-en-tiempo-real-sse)
   - [3.11 Analítica, Métricas y Exportaciones](#311-analítica-métricas-y-exportaciones)
   - [3.12 Usuarios y Roles Administrativos](#312-usuarios-y-roles-administrativos)
   - [3.13 Galería e Historial de Mensajes](#313-galería-e-historial-de-mensajes)
   - [3.14 Webhooks Externos (Meta / Instagram)](#314-webhooks-externos-meta--instagram)
4. [Catálogo de Endpoints del Motor de IA (FastAPI Bot)](#4-catálogo-de-endpoints-del-motor-de-ia-fastapi-bot)

---

## 1. Esquemas de Autenticación y Cabeceras Globales

### 1.1 Esquemas de Autenticación

| Tipo de Autenticación | Esquema / Cabecera | Alcance | Descripción |
|---|---|---|---|
| **Bearer JWT** | `Authorization: Bearer <TOKEN>` | Rutas Administrativas y Staff | Token JWT firmado con `JWT_SECRET`. Contiene `userId`, `email`, `role` (`ADMIN` \| `STAFF`). |
| **Mutual API Key** | `x-api-key: <KEY>` o `x-bot-key: <KEY>` | Servicio a Servicio (API ↔ Bot) | Clave compartida validada con `crypto.timingSafeEqual` y `hmac.compare_digest`. |
| **Self-Service Token** | URL Param `:token` (CUID) | Portal de Autogestión Cliente | Identificador opaco de turno (`/api/appointments/by-token/:token`) con PII enmascarada. |
| **Público** | Sin cabecera | Catálogo, Disponibilidad, Web | Endpoints públicos protegidos por limitadores de tasa IP (Rate Limiters). |

---

## 2. Códigos de Estado HTTP y Envolvente de Errores

### 2.1 Códigos Estándar Utilizados

- **`200 OK`**: Petición procesada exitosamente con payload de retorno.
- **`201 Created`**: Recurso creado satisfactoriamente (e.g. nueva cita, cliente, servicio).
- **`400 Bad Request`**: Error de validación Zod o payload JSON malformado.
- **`401 Unauthorized`**: Token JWT ausente, expirado o firma inválida.
- **`403 Forbidden`**: El rol del usuario no tiene permisos suficientes (e.g. STAFF intentando acceder a ruta ADMIN).
- **`404 Not Found`**: El recurso solicitado (cita, cliente, servicio) no existe.
- **`409 Conflict`**: Conflicto de negocio (e.g. solapamiento de horarios o email ya registrado).
- **`429 Too Many Requests`**: Tasa de peticiones por IP excedida (Rate Limit).
- **`500 Internal Server Error`**: Excepción no controlada en el servidor.
- **`503 Service Unavailable`**: Degradación en base de datos Neon o desconexión de dependencias críticas.

### 2.2 Estructura JSON de Error Estándar

```json
{
  "error": "Mensaje descriptivo del error",
  "details": [
    {
      "field": "date",
      "message": "Fecha inválida. Debe ser una cadena ISO-8601 o fecha válida."
    }
  ],
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

---

## 3. Catálogo de Endpoints de Core API (Express)

### 3.1 Salud y Estado del Sistema

#### `GET /api/health`
- **Descripción:** Deep health check que comprueba conectividad con Neon PostgreSQL.
- **Autenticación:** Pública.
- **Respuesta 200 OK:**
```json
{
  "status": "ok",
  "service": "glow-studio-api",
  "database": "connected",
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```
- **Respuesta 503 Service Unavailable:**
```json
{
  "status": "degraded",
  "service": "glow-studio-api",
  "database": "disconnected",
  "error": "Can't reach database server at `ep-xyz.neon.tech`",
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

---

### 3.2 Autenticación y Sesión

#### `POST /api/auth/login`
- **Descripción:** Inicio de sesión de administradores y personal.
- **Autenticación:** Pública (Rate Limit: 5 intentos cada 15 min).
- **Body Schema (JSON):**
```json
{
  "email": "string (email requerido)",
  "password": "string (mínimo 6 caracteres)"
}
```
- **Respuesta 200 OK:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "cuid_123",
    "email": "admin@glowstudio.com",
    "name": "Sofía Admin",
    "role": "ADMIN"
  }
}
```
- **Errores:** `400 Bad Request` (campos faltantes), `401 Unauthorized` (credenciales inválidas).

#### `GET /api/auth/me`
- **Descripción:** Obtiene los datos del usuario autenticado en base al token JWT enviado.
- **Autenticación:** `Bearer JWT` (ADMIN o STAFF).
- **Respuesta 200 OK:** Perfil de usuario autenticado.

---

### 3.3 Gestión de Turnos (Appointments)

#### `POST /api/appointments`
- **Descripción:** Creación de un nuevo turno de atención con validación Zod y sincronización en Google Calendar.
- **Autenticación:** Pública (Rate Limit especializado).
- **Zod Schema (`createAppointmentSchema`):**
```typescript
{
  date: string (ISO-8601),
  serviceId: string (CUID requerido),
  customerName: string (min 2 chars),
  customerPhone: string (min 6 digits),
  customerEmail?: string (email format or null),
  notes?: string (optional),
  staffId?: string (optional),
  source?: "WEB" | "WHATSAPP" | "INSTAGRAM" (default "WEB"),
  recurrence?: "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" (default "NONE")
}
```
- **Ejemplo de Petición:**
```json
{
  "date": "2026-09-05T14:00:00.000Z",
  "serviceId": "serv_corte_sig_01",
  "customerName": "Camila Rodríguez",
  "customerPhone": "+5491133445566",
  "customerEmail": "camila@example.com",
  "notes": "Prefiere corte en capas",
  "source": "WEB"
}
```
- **Respuesta 201 Created:**
```json
{
  "id": "apt_cuid_789",
  "token": "tok_cuid_abc123",
  "date": "2026-09-05T14:00:00.000Z",
  "endDate": "2026-09-05T14:45:00.000Z",
  "status": "PENDING",
  "calendarEventId": "gcal_event_9988",
  "customer": {
    "id": "cust_123",
    "name": "Camila Rodríguez",
    "phone": "+5491133445566"
  },
  "service": {
    "name": "Corte Signature",
    "price": 25000,
    "duration": 45
  }
}
```
- **Errores:** `400 Bad Request` (esquema inválido), `409 Conflict` (horario ya ocupado por otro turno o bloqueo).

#### `GET /api/appointments/availability`
- **Descripción:** Consulta intervalos disponibles para una fecha y duración específica, calculando intersección entre Google Calendar FreeBusy y turnos en base de datos.
- **Query Params:**
  - `date`: `YYYY-MM-DD` (ej. `2026-09-05`)
  - `serviceId`: ID del servicio para calcular duración
  - `duration`: Minutos opcionales (default: duración del servicio o 45m)
- **Respuesta 200 OK:**
```json
{
  "date": "2026-09-05",
  "availableSlots": [
    "09:00", "09:45", "10:30", "14:00", "14:45", "15:30", "16:15", "17:00", "17:45", "18:15"
  ]
}
```

#### `GET /api/appointments/by-token/:token`
- **Descripción:** Portal de autogestión de turnos para clientes. Retorna los datos de la cita con datos personales (PII) enmascarados para privacidad.
- **Autenticación:** Pública mediante token CUID único.
- **Respuesta 200 OK:**
```json
{
  "id": "apt_cuid_789",
  "token": "tok_cuid_abc123",
  "date": "2026-09-05T14:00:00.000Z",
  "status": "CONFIRMED",
  "customer": {
    "name": "Camila Rodríguez",
    "phone": "+549****66"
  },
  "service": {
    "name": "Corte Signature",
    "price": 25000,
    "duration": 45
  }
}
```

#### `POST /api/appointments/by-token/:token/reschedule`
- **Descripción:** Reagendamiento autónomo por parte del cliente mediante su enlace de autogestión.
- **Body:** `{"newDate": "2026-09-08T16:00:00.000Z"}`
- **Respuesta 200 OK:** Cita actualizada con nuevo horario y evento de Google Calendar sincronizado.

#### `POST /api/appointments/by-token/:token/cancel`
- **Descripción:** Cancelación autónoma por parte del cliente. Dispara automáticamente oferta de lista de espera a clientas en espera si faltaban más de 2 horas.
- **Respuesta 200 OK:** `{"success": true, "message": "Turno cancelado exitosamente"}`

#### `GET /api/appointments`
- **Descripción:** Listado completo y filtrable de citas para administradores.
- **Autenticación:** `Bearer JWT` (ADMIN o STAFF).
- **Query Params:** `startDate`, `endDate`, `status`, `serviceId`, `staffId`, `search`.
- **Respuesta 200 OK:** Array de objetos `Appointment` con relaciones.

#### `PATCH /api/appointments/:id`
- **Descripción:** Actualización de estado de turno por el administrador.
- **Autenticación:** `Bearer JWT` (ADMIN).
- **Body Schema (`updateAppointmentSchema`):**
```json
{
  "status": "CONFIRMED",
  "notes": "Cliente solicitó cambio de estilista"
}
```

---

### 3.4 Catálogo de Servicios

#### `GET /api/services`
- **Descripción:** Catálogo activo de servicios del salón.
- **Autenticación:** Pública.
- **Respuesta 200 OK:**
```json
[
  {
    "id": "serv_1",
    "name": "Corte Signature",
    "price": 25000,
    "duration": 45,
    "category": "cabello",
    "active": true,
    "imageUrl": "https://glowstudio.com/images/corte.jpg"
  }
]
```

#### `POST /api/services` | `PATCH /api/services/:id` | `DELETE /api/services/:id`
- **Autenticación:** `Bearer JWT` (ADMIN).

---

### 3.5 Clientes (Customers)

#### `GET /api/customers`
- **Descripción:** Paginación y búsqueda de clientes por nombre, teléfono o email.
- **Autenticación:** `Bearer JWT`.
- **Query Params:** `search`, `page`, `limit`.

#### `POST /api/customers`
- **Zod Schema (`createCustomerSchema`):**
```json
{
  "name": "Lucía Martínez",
  "phone": "+5491199887766",
  "email": "lucia@example.com",
  "instagram": "@lucia.glow",
  "notes": "Alérgica a tintes con amoníaco"
}
```

---

### 3.6 Equipo y Estilistas (Staff)

#### `GET /api/staff`
- **Descripción:** Lista de profesionales activos, especialidades y horarios de trabajo.
- **Autenticación:** Pública.

#### `POST /api/staff` | `PATCH /api/staff/:id`
- **Autenticación:** `Bearer JWT` (ADMIN).

---

### 3.7 Horarios Bloqueados (Blocked Times)

#### `GET /api/blocked-times`
- **Descripción:** Lista de bloqueos de agenda (vacaciones, feriados, descansos).
- **Autenticación:** Pública.

#### `POST /api/blocked-times`
- **Autenticación:** `Bearer JWT` (ADMIN).
- **Body:**
```json
{
  "startDate": "2026-09-10T13:00:00.000Z",
  "endDate": "2026-09-10T14:00:00.000Z",
  "reason": "Almuerzo del equipo",
  "allDay": false
}
```

---

### 3.8 Lista de Espera (Waitlist)

#### `GET /api/waitlist`
- **Descripción:** Clientes registrados en lista de espera con estado `WAITING`, `OFFERED`, `BOOKED`, `EXPIRED`.
- **Autenticación:** `Bearer JWT` (ADMIN).

#### `POST /api/waitlist`
- **Descripción:** Registro de un cliente en lista de espera para un día sin disponibilidad.
- **Autenticación:** Pública o Bot.
- **Body:**
```json
{
  "customerName": "Valeria Gómez",
  "customerPhone": "+5491122334455",
  "serviceId": "serv_unas_gel",
  "preferredDate": "2026-09-06T00:00:00.000Z",
  "timeRange": "tarde"
}
```

---

### 3.9 Administración de WhatsApp Nativo (Baileys)

#### `GET /api/whatsapp-admin/status`
- **Descripción:** Estado de conexión del socket nativo de Baileys.
- **Autenticación:** Pública / Admin.
- **Respuesta 200 OK:**
```json
{
  "configured": true,
  "instanceName": "glow-studio-native",
  "phone": "5491178296781",
  "state": "open",
  "hasQR": false,
  "pairingCode": null
}
```

#### `GET /api/whatsapp-admin/qr`
- **Descripción:** Retorna el código QR activo en formato DataURL Base64 para escaneo en UI.
- **Respuesta 200 OK:**
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
  "status": "ready"
}
```

#### `POST /api/whatsapp-admin/pairing-code`
- **Descripción:** Genera un código de vinculación de 8 dígitos para un número de teléfono.
- **Autenticación:** `Bearer JWT` (ADMIN).
- **Body:** `{"phoneNumber": "5491178296781"}`
- **Respuesta 200 OK:** `{"pairingCode": "1234-5678"}`

#### `POST /api/whatsapp-admin/send`
- **Descripción:** Emisión manual de un mensaje de WhatsApp a través de la cola de salida.
- **Autenticación:** `Bearer JWT` (ADMIN).
- **Body:** `{"to": "5491133445566", "message": "Hola, confirmamos tu turno de hoy ✨"}`

#### `POST /api/whatsapp-admin/logout`
- **Descripción:** Cierra la sesión activa de WhatsApp y purga las credenciales en PostgreSQL.
- **Autenticación:** `Bearer JWT` (ADMIN).

---

### 3.10 Eventos en Tiempo Real (SSE)

#### `GET /api/realtime/events`
- **Descripción:** Canal Server-Sent Events (SSE) que emite actualizaciones en vivo hacia el Dashboard Administrativo (`appointment_created`, `appointment_status_changed`, `whatsapp_status_update`).
- **Autenticación:** `Bearer JWT` (vía Header o Query param `?token=`).
- **Cabeceras de Respuesta:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`.

---

### 3.11 Analítica, Métricas y Exportaciones

#### `GET /api/admin/metrics`
- **Descripción:** Métricas consolidadas del salón (total citas del día, ingresos proyectados, tasa de cancelación).
- **Autenticación:** `Bearer JWT` (ADMIN).

#### `GET /api/analytics/financial`
- **Descripción:** Desglose financiero por servicio, categoría y período temporal.
- **Autenticación:** `Bearer JWT` (ADMIN).

#### `GET /api/exports/appointments.csv` | `GET /api/exports/customers.csv`
- **Descripción:** Exportación de datos tabulares en formato CSV descargable.
- **Autenticación:** `Bearer JWT` (ADMIN).

---

### 3.12 Usuarios y Roles Administrativos

#### `GET /api/users` | `POST /api/users` | `PATCH /api/users/:id` | `DELETE /api/users/:id`
- **Descripción:** CRUD integral de administradores y personal.
- **Autenticación:** `Bearer JWT` (Exclusivo rol `ADMIN`).

---

### 3.13 Galería e Historial de Mensajes

#### `GET /api/gallery`
- **Descripción:** Imágenes del portfolio del salón clasificadas por categoría (`cabello`, `unas`, `facial`).
- **Autenticación:** Pública.

#### `GET /api/messages` | `POST /api/messages`
- **Descripción:** Consulta del historial de mensajes entrantes/salientes (`MessageLog`) e inserción de notas.
- **Autenticación:** `Bearer JWT`.

---

### 3.14 Webhooks Externos (Meta / Instagram)

#### `GET /api/webhooks/instagram`
- **Descripción:** Verificación de handshake del webhook de Meta (Hub Challenge).
- **Query Params:** `hub.mode=subscribe`, `hub.verify_token=<WEBHOOK_VERIFY_TOKEN>`, `hub.challenge=<CHALLENGE>`.

#### `POST /api/webhooks/instagram`
- **Descripción:** Recepción de mensajes directos de Instagram con validación de firma `x-hub-signature-256` sobre `req.rawBody` mediante `crypto.timingSafeEqual`.
- **Autenticación:** Firma HMAC-SHA256 con `META_APP_SECRET`.

---

## 4. Catálogo de Endpoints del Motor de IA (FastAPI Bot)

### 4.1 Salud e Información del Motor

#### `GET /health`
- **Descripción:** Deep health check del agente de IA que verifica la conexión al pool de base de datos y la disponibilidad de Groq Cloud.
- **Respuesta 200 OK:**
```json
{
  "status": "ok",
  "service": "glow-studio-bot",
  "model": "llama-3.3-70b-versatile",
  "database": "connected",
  "groq_configured": true
}
```

---

### 4.2 Procesamiento de Mensajes Conversacionales

#### `POST /process-message`
- **Descripción:** Procesa un mensaje entrante (Web, WhatsApp o Instagram), ejecuta la máquina de estados, consulta la agenda y retorna la respuesta inteligente junto con imágenes de portfolio si aplica.
- **Autenticación:** Cabecera `x-api-key: <API_SECRET_KEY>` o `x-bot-key: <BOT_API_KEY>`.
- **Request Body (Pydantic Model `MessageRequest`):**
```json
{
  "message": "Hola! Quisiera saber el precio del tratamiento de keratina y reservar para el sábado a la tarde.",
  "sender_id": "5491133445566@s.whatsapp.net",
  "platform": "WHATSAPP",
  "sender_name": "Mariana"
}
```
- **Response Body (Pydantic Model `MessageResponse`):**
```json
{
  "response": "¡Hola Mariana! ✨ El tratamiento Anti-frizz Keratina tiene un valor de $45.000 y una duración de 2 horas. Para este sábado tenemos disponible a las 14:00hs o 16:30hs. ¿Cuál te queda más cómodo? 💕",
  "image_url": "https://glowstudio.com/portfolio/keratina-01.jpg",
  "action": "show_services",
  "data": {
    "category": "tratamientos",
    "suggested_slots": ["14:00", "16:30"]
  }
}
```

---

### 4.3 Transcripción de Audio (Whisper Large v3)

#### `POST /transcribe-audio-file`
- **Descripción:** Recibe un archivo de audio (nota de voz OGG/Opus/MP3 en `multipart/form-data`) y retorna el texto transcrito con Groq Whisper Large v3 Turbo.
- **Autenticación:** `x-api-key: <API_SECRET_KEY>`.
- **Content-Type:** `multipart/form-data` (`file: voice_message.ogg`).
- **Respuesta 200 OK:**
```json
{
  "text": "Hola chicas, quería consultar si tienen turno para esculpidas mañana después de las cinco.",
  "status": "ok"
}
```

#### `POST /transcribe-audio`
- **Descripción:** Alternativa que recibe el binario en crudo en el body o un payload JSON con `audio_base64`.

---

### 4.4 Análisis de Imágenes de Referencia (Groq Vision)

#### `POST /analyze-image`
- **Descripción:** Analiza una foto de referencia estética enviada por el cliente mediante LLaMA 3.2 11B Vision.
- **Autenticación:** `x-api-key: <API_SECRET_KEY>`.
- **Body (JSON):**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "sender_id": "5491133445566@s.whatsapp.net",
  "caption": "Quiero hacerme este diseño en las uñas"
}
```
- **Respuesta 200 OK:**
```json
{
  "interpreted_text": "[La clienta envió una imagen: Uñas esculpidas almendradas con esmaltado baby boomer y detalles de glitter plateado] Quiero hacerme este diseño en las uñas",
  "status": "ok"
}
```

---

### 4.5 Reset de Estado Conversacional

#### `POST /reset-conversation/{sender_id}`
- **Descripción:** Reinicia la memoria de diálogo y el estado de la máquina para un remitente específico.
- **Autenticación:** `x-api-key: <API_SECRET_KEY>`.
- **Respuesta 200 OK:** `{"status": "ok", "message": "Conversation reset for 5491133445566@s.whatsapp.net"}`

---

*Fin de la especificación técnica de APIs.*
