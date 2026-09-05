# 🧠 MEMORY — Glow Studio by Sofia

> Memoria consolidada del proyecto.
> Última actualización: 2026-09-05 (Consolidación de arquitectura moderna y estándares de calidad).
> 
> ### 🛑 PROTOCOLO OBLIGATORIO DE CUENTAS RENDER (MEMORIA PERMANENTE)
> **NUNCA** asumir ni ingresar automáticamente a una cuenta de Render.
> **SIEMPRE** pedir explícitamente al usuario a qué cuenta entrar indicando el correo y el servicio antes de enviar cualquier agente navegador:
> - **Cuenta 1:** `eneidaantonia3010@gmail.com` -> Frontend Web (`glow-studio-web`)
> - **Cuenta 2:** `restrepojivana7@gmail.com` -> Backend API (`glow-studio-api`)
> - **Cuenta 3:** `superfruitas301083@gmail.com` -> Bot IA (`glow-studio-bot`)

---

## Visión General del Proyecto

**Glow Studio by Sofia** es una plataforma omnicanal premium para un salón de belleza ubicado en Av. Corrientes 1234, Buenos Aires. Horario: Lun-Sáb 9:00 a 19:00.

### Stack Técnico y Arquitectura Real
- **Frontend (`apps/web`)**: Next.js 16.2.10 (App Router) + React 19.2.4 + TailwindCSS + Framer Motion (puerto 3000)
  - Wizard de reservas omnicanal, soporte PWA offline (Manifest + Service Worker), `useOptimistic` de React 19 y Skeleton screens.
- **Backend API (`apps/api`)**: Express + TypeScript + Prisma 6.9.0 (puerto 3001)
  - Servicio nativo de WhatsApp con **Baileys v6** con persistencia de auth/sockets en PostgreSQL (`baileys_sessions`).
  - Cola persistente tolerante a fallos `MessageQueue` en PostgreSQL con reintentos inteligentes y backoff exponencial con jitter.
  - Sincronización con Google Calendar, auditoría (`audit_logs`), lista de espera y reseñas verificadas.
- **Bot IA (`apps/bot`)**: Python 3.11 (FastAPI) + Groq LLM Pool (puerto 8000)
  - Modelo principal: `llama-3.3-70b-versatile`. Fallback: `llama-3.1-8b-instant`. Visión: `llama-3.2-11b-vision-preview`.
  - Clasificador de intenciones con scoring de confianza (`confidence >= 0.70`), memoria semántica en Postgres y extracción automática de preferencias del cliente.
- **Base de Datos**: PostgreSQL en Neon Serverless (Prisma ORM 6.9.0).
- **Estándar de Calidad**: `CONSTRAINTS.md` gobernado por `scripts/floor-guard.mjs`.
  - Pipelines: `npm run check:fast`, `npm run check:task`, `npm run check:full`.

### Estructura del Monorepo
```
mi-bot-whatsapp/
├── apps/web/        → Frontend Next.js 16 + React 19 (App Router, UI de reservas)
├── apps/api/        → Express REST API (auth, appointments, Baileys WhatsApp nativo, queues)
├── apps/bot/        → Python 3.11 AI Agent (FastAPI, Groq LLM Pool, memory)
├── prisma/          → Schema único PostgreSQL y migraciones (Prisma 6.9.0)
└── scripts/         → Guardias mecánicas (floor-guard.mjs)
```

---

## Modelos de Base de Datos (Prisma)

| Modelo | Tabla | Propósito |
|--------|-------|-----------|
| **User** | `users` | Admins/staff del salón (email, password hasheada, role) |
| **Service** | `services` | Catálogo de servicios (nombre, precio ARS, duración min, categoría) |
| **Customer** | `customers` | Clientes (nombre, teléfono, email, Instagram, preferencias semánticas JSON, bloqueo) |
| **Staff** | `staff` | Profesionales del salón (especialidades, horarios de trabajo, calendario) |
| **Appointment** | `appointments` | Citas/turnos (fecha inicio/fin, estado, recurrencia, token de cancelación, canal de origen) |
| **Waitlist** | `waitlist` | Lista de espera automática para turnos cancelados o sobreturnos |
| **BlockedTime** | `blocked_times` | Bloqueos de agenda (vacaciones, feriados, horarios de almuerzo) |
| **Review** | `reviews` | Reseñas y calificaciones verificadas (1 a 5 estrellas) |
| **MessageLog** | `message_logs` | Historial omnicanal de mensajes entrantes/salientes (WhatsApp, Instagram, Web) |
| **GalleryImage** | `gallery_images` | Galería de imágenes del salón por categoría |
| **ConversationState** | `conversation_states` | Estado conversacional del bot de IA por senderId |
| **BaileysSession** | `baileys_sessions` | Credenciales y estado de conexión del socket de WhatsApp persistidos en Neon DB |
| **AuditLog** | `audit_logs` | Trazabilidad y auditoría de eventos de seguridad y negocio |
| **MessageQueue** | `message_queue` | Cola de envíos asíncronos y reintentos automáticos para WhatsApp/Instagram |

### Enums
- **Role**: `ADMIN`, `STAFF`
- **AppointmentStatus**: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`
- **RecurrenceInterval**: `NONE`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`
- **WaitlistStatus**: `WAITING`, `OFFERED`, `BOOKED`, `EXPIRED`, `CANCELLED`
- **Platform**: `INSTAGRAM`, `WHATSAPP`, `WEB`
- **MessageDirection**: `INBOUND`, `OUTBOUND`

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

## Lógica del Bot IA y Sockets

- **Flujo de Conversación**: FSM estructurada (`greeting`, `service_selection`, `date_selection`, `time_selection`, `confirmation`, etc.).
- **Procesamiento de Fechas**: Regex rápidos para lenguaje natural ("mañana", "martes 14hs") con fallback a `dateparser`.
- **Pool de LLM**: Groq con fallback dinámico entre modelos (`llama-3.3-70b-versatile` -> `llama-3.1-8b-instant`).
- **WhatsApp Socket**: Conexión nativa con Baileys v6 sin requerir Evolution API externa. Sesiones guardadas directamente en Neon PostgreSQL para resistir reinicios de dynos/contenedores.

---

## Historial de Reflexiones y Hitos

| Fecha | Resumen |
|-------|---------|
| 2026-08-14 | **Análisis de Arquitectura**: Escaneo de Express API y Bot FastAPI. Se integró Baileys nativo local. |
| 2026-08-30 | **Upgrades de WhatsApp, IA y Frontend**: Implementada reconexión Baileys con backoff exponencial + jitter gaussiano, cola persistente `MessageQueue` en PostgreSQL con reintentos inteligentes. Motor de IA con scoring de confianza (`confidence >= 0.70`), memoria semántica extendida y extracción automática de preferencias. Frontend con Skeleton screens, `useOptimistic` de React 19 y PWA offline (Manifest + Service Worker). |
| 2026-09-05 | **Consolidación Monorepo & Next.js 16**: Verificación completa del monorepo con Next.js 16.2.10, React 19.2.4, Prisma 6.9.0. Establecimiento de contrato de calidad en `CONSTRAINTS.md` con scripts `floor-guard.mjs`. Tests 100% en verde (154/154 passing en web, api y bot). Eliminación de dependencias obsoletas (Evolution API) y centralización de la memoria técnica. |
