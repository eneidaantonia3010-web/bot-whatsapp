# 🧠 MEMORY — Glow Studio by Sofia

> Memoria consolidada del proyecto. Actualizada automáticamente por el skill `memory-reflect`.
> Última reflexión: 2026-08-22
> 
> ### 🛑 PROTOCOLO OBLIGATORIO DE CUENTAS RENDER (MEMORIA PERMANENTE)
> **NUNCA** asumir ni ingresar automáticamente a una cuenta de Render.
> **SIEMPRE** pedir explícitamente al usuario a qué cuenta entrar indicando el correo y el servicio antes de enviar cualquier agente navegador:
> - **Cuenta 1:** `eneidaantonia3010@gmail.com` -> Frontend Web (`glow-studio-web`)
> - **Cuenta 2:** `restrepojivana7@gmail.com` -> Backend API (`glow-studio-api`)
> - **Cuenta 3:** `superfruitas301083@gmail.com` -> Bot IA (`glow-studio-bot`)

---

## Visión General del Proyecto

**Glow Studio by Sofia** es una aplicación web premium para un salón de belleza ubicado en Av. Corrientes 1234, Buenos Aires. Horario: Lun-Sáb 9:00 a 19:00.

### Stack Técnico y Arquitectura
- **Frontend (`apps/web`)**: Next.js 14 (App Router) + TailwindCSS + Framer Motion (puerto 3000)
- **Backend API (`apps/api`)**: Express + TypeScript (puerto 3001)
  - Autenticación, Rate Limiting, y Webhooks.
  - Implementa un servicio nativo de WhatsApp con Baileys (`initNativeWhatsApp`), además de soportar Evolution API.
- **Bot IA (`apps/bot`)**: Python (FastAPI) + Groq (LLaMA 3.1 8B Instant) (puerto 8000)
  - *Nota: Aunque el README menciona Gemini 2.0 Flash, el código usa LLaMA 3.1 en Groq.*
- **Base de Datos**: PostgreSQL en Neon (Prisma ORM)
- **Deploy**: Frontend → Vercel | API + Bot → Render/Railway
- **Package Manager**: pnpm (monorepo con workspaces)

### Estructura del Monorepo
```
mi-bot-whatsapp/
├── apps/web/        → Frontend Next.js 14 (App Router, globals.css)
├── apps/api/        → Express API REST (auth, customers, appointments, webhooks)
├── apps/bot/        → Python AI Agent (FastAPI, Groq, state management)
├── prisma/          → Schema + Seed
└── prisma-evolution/ → Schema separado para Evolution API
```

---

## Modelos de Base de Datos (Prisma)

| Modelo | Propósito |
|--------|-----------|
| **User** | Admins/staff del salón (email, password, role) |
| **Service** | Catálogo de servicios (nombre, precio en ARS, duración en minutos, categoría) |
| **Customer** | Clientes (nombre, phone, email, instagram, puede ser bloqueado) |
| **Appointment** | Turnos/citas (date, status, vinculado a customer + service, fuente: WEB/INSTAGRAM/WHATSAPP) |
| **MessageLog** | Historial de mensajes por plataforma (platform, direction, metadata JSON) |
| **GalleryImage** | Galería del salón (url, categoría, orden) |
| **ConversationState** | Estado de conversación del bot por sender (JSON) |
| **AuditLog** | Auditoría de acciones (userId, action, entity, details) |

### Enums
- **Role**: ADMIN, STAFF
- **AppointmentStatus**: PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
- **Platform**: INSTAGRAM, WHATSAPP, WEB
- **MessageDirection**: INBOUND, OUTBOUND

---

## Servicios del Salón

| Servicio | Precio ARS | Duración |
|----------|-----------|----------|
| Corte Signature | $25.000 | 45min |
| Corte Hombre Premium | $15.000 | 30min |
| Uñas Gel Luxury | $28.000 | 1h 15min |
| Esmaltado Semi Pro | $18.000 | 45min |
| Facial Glow | $35.000 | 1h |
| Anti-frizz Keratina | $45.000 | 2h |

---

## Lógica del Bot IA (Detalles)
- **Etapas de Conversación**: El agente tiene un flujo estructurado guardado en estado (`greeting`, `service_selection`, `date_selection`, etc.).
- **Procesamiento de Fechas**: Usa reglas rápidas de regex (ej. "mañana", "martes 14hs") y hace fallback a la librería `dateparser`.
- **Backend LLM**: Conecta a Groq y procesa a través del modelo `llama-3.1-8b-instant`.
- **API (FastAPI)**: Expone el endpoint `/process-message` usado por la API en Express cuando entran webhooks de Instagram o WhatsApp.

---

## Decisiones Técnicas y Estado Actual

- Se usa **pnpm** como package manager.
- Prisma genera el client en `postinstall`.
- Integraciones configuradas:
  - Meta Webhooks (Instagram DMs)
  - Native WhatsApp (Baileys embebido en Express) y Evolution API
  - Google Calendar Sync
- El servidor Express maneja CORS permitiendo peticiones desde Vercel y localhost.
- El servidor arranca servicios programados (cron jobs) y el cliente de WhatsApp al iniciar.

---

## Historial de Reflexiones

| Fecha | Resumen |
| 2026-08-14 | **Análisis Exhaustivo**: Se escaneó código fuente real (Python bot, Express API). Se descubrió que el bot usa Groq (LLaMA 3.1) en lugar de Gemini, y que la API inicializa un cliente nativo de WhatsApp local (Baileys) además de estar preparada para Evolution API. Se registró la arquitectura del App Router de Next.js y el enrutamiento de Express. |
| 2026-08-30 | **Upgrades de WhatsApp, IA y Frontend**: Implementada reconexión Baileys con backoff exponencial + jitter gaussiano, cola persistente `MessageQueue` en Neon PostgreSQL con reintentos inteligentes y backoff 403. Motor de IA con scoring de confianza (`confidence >= 0.70`), memoria semántica extendida y extracción automática de preferencias. Frontend con Skeleton screens, `useOptimistic` de React 19 y PWA offline (Manifest + Service Worker). |

