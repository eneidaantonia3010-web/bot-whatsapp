# 🏛️ Architecture & System Design — Glow Studio by Sofia

> **Document Version:** 2.0.0  
> **Target Audience:** Principal Engineers, Tech Leads, DevOps, Solutions Architects  
> **Status:** Approved / Living Architecture  
> **Last Updated:** 2026-08-30

---

## 📑 Tabla de Contenidos
1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Diagramas C4 (Mermaid)](#2-diagramas-c4-mermaid)
   - [Nivel 1: Contexto del Sistema (System Context)](#nivel-1-contexto-del-sistema-system-context)
   - [Nivel 2: Contenedores (Container Diagram)](#nivel-2-contenedores-container-diagram)
   - [Nivel 3: Componentes de Express API](#nivel-3-componentes-de-express-api)
   - [Nivel 3: Componentes del Bot IA (FastAPI)](#nivel-3-componentes-del-bot-ia-fastapi)
   - [Nivel 3: Componentes del Frontend (Next.js 16)](#nivel-3-componentes-del-frontend-nextjs-16)
3. [Flujos de Datos Principales](#3-flujos-de-datos-principales)
   - [3.1 Flujo de Reserva Multicanal](#31-flujo-de-reserva-multicanal)
   - [3.2 Pipeline Conversacional del Bot IA (Groq Cloud)](#32-pipeline-conversacional-del-bot-ia-groq-cloud)
   - [3.3 Persistencia de Sockets Baileys en PostgreSQL](#33-persistencia-de-sockets-baileys-en-postgresql)
   - [3.4 Sincronización Bidireccional con Google Calendar](#34-sincronización-bidireccional-con-google-calendar)
   - [3.5 Cola de Mensajería Saliente y Resiliencia Anti-Ban](#35-cola-de-mensajería-saliente-y-resiliencia-anti-ban)
4. [Capas de Seguridad y Blindaje de Red](#4-capas-de-seguridad-y-blindaje-de-red)
5. [Topología de Despliegue e Infraestructura](#5-topología-de-despliegue-e-infraestructura)

---

## 1. Visión General del Sistema

**Glow Studio by Sofia** es una plataforma tecnológica integral para la automatización, gestión y atención omnicanal de salones de belleza y estética premium.

El sistema resuelve la convergencia de tres canales principales de interacción (Página Web interactiva, WhatsApp conversacional nativo y Mensajes Directos de Instagram) hacia un único núcleo unificado de agenda, disponibilidad en tiempo real, inteligencia artificial generativa trilingüe y sincronización con calendarios corporativos.

### Principios Arquitectónicos Clave
- **Monorepo Cohesivo:** Separación estricta de dominios entre Frontend (`apps/web`), Backend API REST (`apps/api`), Agente IA (`apps/bot`) y Modelo de Datos compartido (`prisma/schema.prisma`).
- **Independencia de Servicios Externos:** Servicio de WhatsApp nativo multi-dispositivo mediante `@whiskeysockets/baileys` embebido, eliminando dependencias de pasarelas de pago recurrentes de terceros.
- **Validación Estricta en Tiempo de Ejecución:** Validación universal mediante **Zod** en contratos HTTP y esquemas de entorno.
- **Resiliencia y Autonomía:** Reintentos exponenciales con jitter, colas persistentes en base de datos (`MessageQueue`), y degradación suave ante desconexiones de red.

---

## 2. Diagramas C4 (Mermaid)

### Nivel 1: Contexto del Sistema (System Context)

El siguiente diagrama ilustra los actores humanos, el ecosistema de Glow Studio y las dependencias de plataformas externas.

```mermaid
C4Context
    title Diagrama de Contexto del Sistema — Glow Studio by Sofia

    Person(customer, "Clienta / Usuario", "Consulta catálogo, reserva turnos, interactúa por WhatsApp, Web o Instagram.")
    Person(admin, "Administrador / Staff", "Gestiona turnos, bloqueos de agenda, catálogo de servicios y monitorea WhatsApp.")

    System_Boundary(glow_boundary, "Glow Studio Platform") {
        System(glow_system, "Glow Studio Enterprise System", "Plataforma web, API REST, persistencia relacional y agente conversacional con IA.")
    }

    System_Ext(meta_instagram, "Meta Graph API (Instagram)", "Entrega webhooks de mensajes directos y recibe respuestas.")
    System_Ext(whatsapp_net, "Red WhatsApp (WhatsApp Network)", "Transporte de mensajes P2P WebSocket mediante protocolo Baileys.")
    System_Ext(groq_cloud, "Groq Cloud AI LPU", "Inferencia de ultra baja latencia: LLaMA 3.3 70B, LLaMA 3.1 8B, Vision y Whisper.")
    System_Ext(google_calendar, "Google Calendar API", "Sincronización bidireccional y control de disponibilidad horaria del salón.")
    System_Ext(neon_postgres, "Neon Serverless PostgreSQL", "Persistencia relacional, sesiones criptográficas Baileys y colas de mensajes.")

    Rel(customer, glow_system, "Navega, reserva y autogestiona turnos vía Web UI")
    Rel(customer, whatsapp_net, "Envía textos, audios e imágenes de referencia")
    Rel(customer, meta_instagram, "Envía mensajes directos (DMs)")

    Rel(admin, glow_system, "Administra turnos, vincula WhatsApp y visualiza métricas")

    Rel(glow_system, whatsapp_net, "Mantiene socket Baileys persistente y envía respuestas")
    Rel(meta_instagram, glow_system, "Notifica webhooks HTTPS con firma HMAC-SHA256")
    Rel(glow_system, meta_instagram, "Envía respuestas vía Graph API")
    Rel(glow_system, groq_cloud, "Infiere intenciones, transcribe audios y procesa visión")
    Rel(glow_system, google_calendar, "Crea eventos, actualiza y consulta FreeBusy")
    Rel(glow_system, neon_postgres, "Lecturas y escrituras ACID transaccionales")
```

---

### Nivel 2: Contenedores (Container Diagram)

El sistema se compone de tres micro-servicios autónomos orquestados en la nube y respaldados por Neon PostgreSQL.

```mermaid
C4Container
    title Diagrama de Contenedores — Glow Studio by Sofia

    Person(client, "Cliente / Administrador", "Navegador Web / Celular")

    Container_Boundary(monorepo, "Glow Studio Monorepo Topology") {
        Container(web_app, "Frontend Web (apps/web)", "Next.js 16, React 19, TailwindCSS v4", "Interfaz de usuario reactiva, catálogo, portal de autogestión y dashboard administrativo.")
        Container(api_app, "Core API Backend (apps/api)", "Express 4, TypeScript, Prisma ORM 6, Baileys", "API REST, autorización JWT, persistencia de sockets WhatsApp, sincronización de calendario y cron jobs.")
        Container(bot_app, "AI Agent Engine (apps/bot)", "Python 3.11, FastAPI, Pydantic, Dateparser", "Máquina de estados conversacionales, clasificación semántica, memoria de preferencias y orquestación LLM.")
    }

    ContainerDb(db, "Base de Datos Principal", "Neon PostgreSQL (Serverless)", "Esquema relacional de clientes, turnos, catálogo, colas persistentes y credenciales Baileys.")

    System_Ext(groq_lpu, "Groq Cloud API", "Inferencia LLaMA 3.3 70B, 3.1 8B, Whisper y LLaMA Vision")
    System_Ext(gcal, "Google Calendar API", "Calendario corporativo oficial")
    System_Ext(meta_ig, "Instagram Webhook Gateway", "Meta Direct Messaging API")

    Rel(client, web_app, "HTTPS (Port 443 / 3000)", "Navegación y Gestión")
    Rel(client, api_app, "WebSocket Nativo (Baileys)", "Interacción WhatsApp")

    Rel(web_app, api_app, "JSON / HTTPS", "REST API & SSE Realtime (/api/realtime/events)")
    Rel(api_app, bot_app, "JSON / HTTP", "POST /process-message, /analyze-image, /transcribe-audio")
    Rel(meta_ig, api_app, "HTTPS POST", "Webhooks HMAC-SHA256 (/api/webhooks/instagram)")

    Rel(api_app, db, "TCP / SSL (Prisma Client)", "Lectura/Escritura Relacional y Baileys Store")
    Rel(bot_app, db, "TCP / SSL (psycopg2 Connection Pool)", "Lectura de Catálogo y Estados Conversacionales")

    Rel(bot_app, groq_lpu, "HTTPS / REST", "Consultas de Inferencia LLM")
    Rel(api_app, gcal, "HTTPS / OAuth Service Account", "Inserción y Consulta de Eventos")
```

---

### Nivel 3: Componentes de Express API

Desglose interno de los módulos, servicios y middlewares de `apps/api`.

```mermaid
C4Component
    title Diagrama de Componentes — Core API Backend (apps/api)

    Container_Boundary(api_core, "Express API (apps/api/src)") {
        Component(router_http, "Enrutadores REST", "Express Routers", "auth, appointments, services, customers, staff, waitlist, admin, realtime, exports")
        Component(mw_auth, "Middleware de Seguridad", "auth.ts & rate-limit.ts", "Validación JWT, control de roles (ADMIN/STAFF), limitación de tasa por IP.")
        Component(mw_webhook, "Webhook Security Validator", "webhook-security.ts", "Validación de firmas HMAC-SHA256 sobre rawBody y timingSafeEqual.")
        
        Component(baileys_svc, "Native WhatsApp Service", "whatsapp-native.ts", "Gestor de conexión Baileys, simulación de presencia 'composing' y transcripción.")
        Component(baileys_store, "Prisma Auth Store", "baileys-store.ts", "Adaptador que sincroniza claves de cifrado y credenciales en Neon.")
        Component(queue_svc, "Message Queue Processor", "message-queue.ts", "Cola por remitente en memoria y cola persistente en DB con backoff exponencial.")
        Component(calendar_svc, "Calendar Sync Engine", "calendar.ts", "Integración con Google Calendar API (CRUD y FreeBusy).")
        Component(cron_engine, "Cron Job Scheduler", "cron.ts", "Recordatorios 24h/45m, re-engagement 30 días, expiración de lista de espera.")
        Component(prisma_layer, "Data Access Layer", "prisma.ts", "Instancia singleton de Prisma Client con connection pooling.")
    }

    Rel(router_http, mw_auth, "Pasa por validación de tokens y límites")
    Rel(router_http, prisma_layer, "Ejecuta consultas transaccionales")
    Rel(router_http, calendar_svc, "Dispara sincronización en creación/cancelación")

    Rel(baileys_svc, baileys_store, "Carga y persiste credenciales criptográficas")
    Rel(baileys_svc, queue_svc, "Encola mensajes entrantes y salientes")
    Rel(baileys_store, prisma_layer, "Guarda estado en baileys_sessions")

    Rel(cron_engine, prisma_layer, "Monitorea citas pendientes y ofertas expiradas")
    Rel(cron_engine, queue_svc, "Emite recordatorios automáticos hacia WhatsApp")
```

---

### Nivel 3: Componentes del Bot IA (FastAPI)

Estructura interna del motor conversacional inteligente en `apps/bot`.

```mermaid
C4Component
    title Diagrama de Componentes — Motor de IA Conversacional (apps/bot)

    Container_Boundary(bot_core, "Python FastAPI Engine (apps/bot)") {
        Component(api_gateway, "FastAPI Endpoints", "main.py", "/process-message, /transcribe-audio-file, /analyze-image, /health")
        Component(agent_orch, "Agent Orchestrator", "agent.py", "Máquina de estados de diálogo (greeting, service_selection, date_selection, confirmation).")
        Component(intent_clf, "Intent Classifier", "intent_classifier.py", "Clasificación con LLaMA 3.3 70B y scoring de confianza (confidence >= 0.70).")
        Component(llm_pool, "Groq LLM Pool", "llm_pool.py", "Pool de clientes Groq con rotación de claves, fallback automático a LLaMA 3.1 8B.")
        Component(memory_svc, "Semantic Memory & Prefs", "memory.py", "Extracción y almacenamiento de preferencias estéticas y fórmulas de cabello.")
        Component(vision_svc, "Groq Vision Analyzer", "vision.py", "Análisis multimodal de imágenes de referencia (uñas, tintes, peinados).")
        Component(transcribe_svc, "Whisper Audio Transcriber", "audio_transcribe.py", "Conversión de notas de voz OGG/Opus a texto con Whisper Large v3.")
        Component(faq_esc, "FAQ & Human Escalation", "faq_handler.py & escalation.py", "Respuestas estáticas rápidas y transferencia automática tras 3 fallos.")
        Component(db_bot, "Database Bridge", "database.py", "Pool psycopg2, persistencia de estados y verificación de solapamiento.")
    }

    Rel(api_gateway, agent_orch, "Envía payload de mensaje y sender_id")
    Rel(api_gateway, transcribe_svc, "Procesa archivos de audio binarios")
    Rel(api_gateway, vision_svc, "Procesa imágenes en base64")

    Rel(agent_orch, intent_clf, "Determina intención y entidades")
    Rel(agent_orch, llm_pool, "Genera respuestas empáticas contextualizadas")
    Rel(agent_orch, memory_svc, "Consulta historial y preferencias semánticas")
    Rel(agent_orch, faq_esc, "Verifica preguntas frecuentes o umbral de escalación")
    Rel(agent_orch, db_bot, "Consulta disponibilidad de catálogo y guarda estado")
```

---

### Nivel 3: Componentes del Frontend (Next.js 16)

Arquitectura de presentación moderna en `apps/web`.

```mermaid
C4Component
    title Diagrama de Componentes — Frontend Web (apps/web)

    Container_Boundary(web_arch, "Next.js 16 App Router (apps/web/src)") {
        Component(app_router, "App Router (/app)", "Layouts, Pages, Error Boundaries", "Página principal (/), Admin Dashboard (/admin), Portal de Token (/by-token/[token]).")
        Component(ui_components, "Componentes UI", "Radix UI + TailwindCSS v4", "Servicios, Calendario de reserva, Selector de horarios, Galería interactiva.")
        Component(chat_widget, "Floating Webchat Widget", "React 19 Hooks + Motion", "Chatbot en vivo conectado directamente con la API del bot.")
        Component(state_hooks, "Custom Hooks & Optimistic UI", "hooks/ & useOptimistic", "Gestión reactiva de estado local, reservas optimistas y mutaciones.")
        Component(api_client, "Type-safe API Client", "lib/api.ts", "Fetch wrapper con AbortSignal, reintentos y tipos inferidos de Zod.")
        Component(pwa_sw, "PWA & Offline Worker", "public/sw.js & manifest.json", "Caché de activos estáticos y soporte para instalación móvil.")
    }

    Rel(app_router, ui_components, "Renderiza vistas modulares")
    Rel(app_router, chat_widget, "Monta widget flotante global")
    Rel(ui_components, state_hooks, "Consume estado reactivo")
    Rel(state_hooks, api_client, "Ejecuta peticiones HTTP hacia Express API")
```

---

## 3. Flujos de Datos Principales

### 3.1 Flujo de Reserva Multicanal

Diagrama de secuencia de una reserva iniciada desde la Web o WhatsApp, mostrando la sincronización en base de datos y Google Calendar:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente
    participant Web as 🌐 Next.js Web UI
    participant API as ⚡ Express API
    participant Bot as 🤖 Python AI Bot
    participant DB as 🐘 Neon PostgreSQL
    participant GCal as 📅 Google Calendar

    alt Reserva por Web UI
        Cliente->>Web: Selecciona Servicio + Fecha/Hora + Datos de contacto
        Web->>API: POST /api/appointments (Zod Schema Validation)
        API->>DB: SELECT solapamientos en 'appointments' y 'blocked_times'
        alt Horario ocupado
            API-->>Web: HTTP 409 Conflict ("Horario no disponible")
            Web-->>Cliente: Notifica conflicto y ofrece lista de espera
        else Horario disponible
            API->>DB: INSERT into 'appointments' (Status: PENDING/CONFIRMED)
            API->>GCal: insertEvent(summary, date, duration)
            GCal-->>API: Devuelve calendarEventId
            API->>DB: UPDATE appointment SET calendarEventId
            API->>API: Encola confirmación de WhatsApp
            API-->>Web: HTTP 201 Created (Token de autogestión)
            Web-->>Cliente: Pantalla de confirmación con enlace de autogestión
        end
    else Reserva por WhatsApp
        Cliente->>API: Mensaje de WhatsApp entrante ("Quiero corte para el viernes a las 15hs")
        API->>API: Baileys Socket recibe mensaje + Simula presencia 'composing'
        API->>Bot: POST /process-message
        Bot->>DB: Consulta servicios y disponibilidad
        Bot->>Bot: LLM clasifica 'book_appointment', extrae fecha 'viernes 15:00'
        Bot-->>API: Respuesta conversacional de confirmación
        API->>DB: Crea turno y registra mensaje INBOUND/OUTBOUND
        API->>GCal: Sincroniza evento en Google Calendar
        API->>API: Envía mensaje formateado a WhatsApp del cliente
    end
```

---

### 3.2 Pipeline Conversacional del Bot IA (Groq Cloud)

El procesamiento conversacional ejecuta un pipeline multi-etapa con análisis semántico, memoria de usuario y tolerancia a fallos:

```mermaid
flowchart TD
    A([📩 Mensaje Entrante]) --> B{¿Es Audio o Imagen?}
    
    B -- Es Audio --> C[🎤 Whisper Large v3 Turbo Transcribe]
    B -- Es Imagen --> D[🖼️ LLaMA 3.2 11B Vision Analiza]
    B -- Es Texto --> E[📝 Normalización de Texto]
    
    C --> E
    D --> E
    
    E --> F[🔍 Detección Anti Prompt-Injection]
    F --> G[🧠 Carga de Memoria Semántica y Preferencias del Cliente]
    G --> H[🤖 LLaMA 3.3 70B: Clasificación de Intención y Entidades]
    
    H --> I{¿Score Confianza >= 0.70?}
    I -- No --> J[⚠️ Reintento con LLaMA 3.1 8B Instant / Fallback]
    I -- Sí --> K{Intención Detectada}
    
    K -- FAQ General --> L[💬 Genera respuesta rápida de ubicación/horarios]
    K -- Reserva / Cancelación --> M[📅 Consulta y muta agenda en Neon DB]
    K -- Consulta de Estilo --> N[🖼️ Selecciona foto del portfolio de Neon DB]
    K -- Fallo Consecutivo (>=3) --> O[🚨 Escalación a WhatsApp Humano]
    
    J --> K
    L --> P[💾 Guarda Estado Conversacional en Postgres]
    M --> P
    N --> P
    O --> P
    
    P --> Q([📤 Retorna JSON a Express API])
```

---

### 3.3 Persistencia de Sockets Baileys en PostgreSQL

Para operar de forma completamente nativa sin depender de servicios externos de pago y resistir reinicios en servidores efímeros (como Render Free Tier), las credenciales de WhatsApp se persisten en Neon PostgreSQL:

```mermaid
flowchart LR
    subgraph Baileys Core
        Sock[makeWASocket Client]
        EvAuth[creds.update Event]
        EvKeys[keys.set Event]
    end

    subgraph Adapters [apps/api/src/services/baileys-store.ts]
        AuthHook[usePrismaAuthState]
        Serializer[BufferJSON Replacer / Reviver]
    end

    subgraph Neon Postgres
        TableSessions[(baileys_sessions)]
    end

    Sock -->|Emite actualización de credenciales| EvAuth
    Sock -->|Emite rotación de claves criptográficas| EvKeys

    EvAuth --> AuthHook
    EvKeys --> AuthHook

    AuthHook -->|Serializa Buffers a JSON| Serializer
    Serializer -->|Upsert Key: baileys_creds / baileys_key_*| TableSessions

    TableSessions -->|En arranque del servidor: Load Keys| Serializer
    Serializer -->|Reconstruye Claves Criptográficas| AuthHook
    AuthHook -->|Restaura Sesión sin requerir nuevo QR| Sock
```

#### Propiedades del Adaptador:
- **Clave Maestra:** `baileys_creds` almacena el par de claves Noise, identidad y estado de registro.
- **Claves Específicas:** `baileys_key_<type>_<id>` almacena pre-claves, claves de sesión de remitentes y cadenas de cifrado.
- **Reviver / Replacer Criptográfico:** Convierte arrays de bytes `Buffer` de Node.js a representaciones JSON serializables con preservación exacta de longitud.

---

### 3.4 Sincronización Bidireccional con Google Calendar

El módulo `calendar.ts` interactúa con Google Calendar mediante autenticación OAuth de Cuenta de Servicio (`GoogleAuth`):

```mermaid
flowchart TD
    subgraph Creación de Turno
        A[POST /api/appointments] --> B[Valida conflicto en DB]
        B --> C[Inserta Turno en Neon DB]
        C --> D[Llama calendar.events.insert]
        D --> E{¿Respuesta Exitosa?}
        E -- Sí --> F[Guarda calendarEventId en Appointment]
        E -- No --> G[Loguea advertencia: DB preserva la cita]
    end

    subgraph Consulta de Disponibilidad
        H[GET /api/appointments/availability] --> I[Consulta FreeBusy en Google Calendar]
        I --> J[Consulta Turnos y Bloqueos en Neon DB]
        J --> K[Calcula intersección de slots libres de 30/45/60 min]
        K --> L[Retorna slots disponibles a Web y Bot]
    end

    subgraph Cancelación o Reagendamiento
        M[POST /api/appointments/:id/cancel] --> N[Actualiza estado a CANCELLED]
        N --> O[Llama calendar.events.delete usando calendarEventId]
        O --> P[Evento eliminado de Google Calendar]
    end
```

---

### 3.5 Cola de Mensajería Saliente y Resiliencia Anti-Ban

Para garantizar el cumplimiento de las políticas de uso y prevenir bloqueos de cuenta de WhatsApp, la API implementa una arquitectura de doble cola:

```mermaid
flowchart TD
    subgraph Emisión de Mensajes
        A[Mensaje Saliente Bot/Cron/Admin] --> B{¿Socket WhatsApp 'open'?}
    end

    subgraph Encolamiento
        B -- No Conectado --> C[📥 Encola en DB: Table message_queue con Priority 1-3]
        B -- Conectado --> D[⚙️ Encola en Global Outbound Chain en Memoria]
    end

    subgraph Procesamiento Outbound
        D --> E[⏱️ Aplica Espaciado Mínimo: MIN_OUTBOUND_GAP_MS = 1500ms]
        E --> F[✍️ Simula Presencia 'composing' durante 1500ms - 2300ms]
        F --> G[🚀 Envía Mensaje por Baileys Socket]
        G --> H[✋ Envía Presencia 'paused']
    end

    subgraph Worker de Recuperación Persistente
        C --> I[⏰ Worker Periódico cada 8-10 seg]
        I --> J{¿Existe Bloqueo de Seguridad 403?}
        J -- Sí --> K[⏳ Pausa Cola durante 1 hora por seguridad anti-ban]
        J -- No --> L[Recupera mensajes PENDING ordenados por prioridad y fecha]
        L --> D
    end
```

---

## 4. Capas de Seguridad y Blindaje de Red

```mermaid
graph TD
    subgraph Edge Layer
        WAF[Render DDoS Protection / Vercel Edge]
        SSL[TLS 1.3 / SSL Termination]
    end

    subgraph API Security Middleware
        SecHeaders[Helmet Security Headers: CSP, HSTS, X-Frame-Options]
        CORS[CORS Whitelist: Vercel Domains, Localhost]
        RateLimit[Rate Limiters Diferenciados: Auth, Citas, Webhooks, SSE]
        HmacVerify[HMAC-SHA256 RawBody Signature Verification]
        TimingEq[crypto.timingSafeEqual en Comparación de Secretos]
    end

    subgraph Auth & Access Control
        JWT[JWT Bearer Auth: Roles ADMIN & STAFF]
        BotKey[Mutual Internal Secret: x-api-key / x-bot-key]
        MaskPII[Enmascaramiento de Datos Personales en Portal de Tokens]
    end

    WAF --> SSL
    SSL --> SecHeaders
    SecHeaders --> CORS
    CORS --> RateLimit
    RateLimit --> HmacVerify
    HmacVerify --> TimingEq
    TimingEq --> JWT
    TimingEq --> BotKey
    JWT --> MaskPII
```

---

## 5. Topología de Despliegue e Infraestructura

| Componente | Servicio en Render / Plataforma | Runtime / Versión | Propósito | Cuenta de Render |
|---|---|---|---|---|
| **Frontend Web** | `glow-studio-web` (o Vercel) | Node.js 20+ (Next.js 16) | Interfaz pública y panel administrativo | `eneidaantonia3010@gmail.com` |
| **Core API Backend** | `glow-studio-api` | Node.js 22 (Express 4) | API REST, Baileys WhatsApp, Cron Jobs | `restrepojivana7@gmail.com` |
| **AI Bot Engine** | `glow-studio-bot` | Python 3.11.9 (FastAPI) | Agente conversacional e inferencia Groq | `superfruitas301083@gmail.com` |
| **Base de Datos** | Neon Serverless Postgres | PostgreSQL 16 | Almacenamiento relacional ACID | Neon Cloud |
| **Monitoreo Keep-Alive** | UptimeRobot | HTTP / Ping | Previene suspensión por inactividad | Externo |

---

*Fin del documento de arquitectura.*
