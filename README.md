# 💅 Glow Studio by Sofia

> **Aplicación web premium para salón de belleza** — Next.js 14 + Express + Python AI Agent + PostgreSQL (Neon)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)

---

## ✨ Características

### 🌐 Frontend (Next.js 14)
- Landing page premium con Hero, Servicios, Galería, Equipo, Testimonios
- Sistema de reservas con calendario interactivo
- Panel de administración con métricas
- Chatbot flotante con IA
- Diseño responsive, animaciones Framer Motion
- SEO optimizado

### 🔧 Backend (Express + TypeScript)
- API REST completa (CRUD servicios, turnos, clientes, bloqueos de horarios, lista de espera)
- Webhooks seguros para Instagram DMs y WhatsApp con validación de firmas HMAC
- Integración bidireccional con Google Calendar API v3
- Servicio In-App nativo de WhatsApp (Baileys + PostgreSQL Store) con simulación anti-ban de presencia
- Cron jobs inteligentes: recordatorios automáticos (24h y 45m), re-engagement, expiración de lista de espera

### 🤖 Bot IA (Python + FastAPI + Groq Cloud)
- Motor conversacional multi-modelo con **Groq Cloud**:
  - **LLaMA 3.1 8B Instant** para razonamiento y extracción de intenciones
  - **LLaMA 3.2 11B Vision** para interpretar fotos de referencia (cortes, peinados, uñas)
  - **Whisper Large v3 Turbo** para transcripción de notas de voz
- Soporte trilingüe con detección automática (**Español**, **Portugués**, **Inglés**)
- Persistencia de estado en PostgreSQL con bloqueos de concurrencia por remitente
- Escalación humana automática a Sofía por WhatsApp ante consultas complejas
- Gestión conversacional completa: reservas multi-servicio, reagendamientos, cancelaciones pedagógicas y lista de espera

### 💾 Base de Datos (Neon PostgreSQL Serverless)
- Prisma ORM con 8 modelos relacionales (`Appointment`, `Customer`, `Service`, `BlockedTime`, `Waitlist`, `User`, `MessageLog`, `BaileysAuth`)
- Connection pooler PgBouncer optimizado para Scale-to-Zero auto-suspend

---

## 🚀 Setup Rápido

### 1. Crear Base de Datos en Neon

1. Ir a [neon.tech](https://neon.tech) y crear un proyecto
2. Copiar el `DATABASE_URL` de la conexión

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales reales
```

### 3. Instalar Dependencias

```bash
# Root + Prisma
npm install

# Frontend
cd apps/web && npm install

# Backend
cd apps/api && npm install

# Bot (requiere Python 3.11+)
cd apps/bot && pip install -r requirements.txt
```

### 4. Crear Tablas en Neon

```bash
npm run db:push
```

### 5. Cargar Datos Ficticios

```bash
npm run db:seed
```

### 6. Ejecutar en Desarrollo

```bash
# Terminal 1 — Frontend (puerto 3000)
npm run dev:web

# Terminal 2 — API (puerto 3001)
npm run dev:api

# Terminal 3 — Bot IA (puerto 8000)
npm run dev:bot
```

### 7. Abrir en el navegador

- **Web**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **API**: https://glow-studio-api-2vzt.onrender.com/api/health
- **Bot**: https://glow-studio-bot-alrb.onrender.com/health

---

## 📁 Estructura del Proyecto

```
glow-studio/
├── apps/
│   ├── web/          # Next.js 14 Frontend
│   ├── api/          # Express Backend
│   └── bot/          # Python AI Agent
├── prisma/
│   ├── schema.prisma # Database schema
│   └── seed.ts       # Seed data
├── .env.example      # Environment template
├── package.json      # Root scripts
└── README.md
```

---

## 🔌 Integraciones

### Google Calendar
1. Crear un Service Account en Google Cloud Console
2. Habilitar Google Calendar API
3. Compartir el calendario con el email del service account
4. Agregar las credenciales JSON en `GOOGLE_CREDENTIALS`

### Instagram DMs (Meta Webhook)
1. Crear una app en Meta for Developers
2. Configurar webhook URL: `https://tu-api.com/api/webhooks/instagram`
3. Suscribirse a eventos de mensajes
4. Agregar `META_VERIFY_TOKEN` y `META_PAGE_ACCESS_TOKEN`

### WhatsApp (Evolution API)
1. Instalar Evolution API (self-hosted o en Render)
2. Crear una instancia
3. Agregar `EVOLUTION_API_URL` y `EVOLUTION_API_KEY`

---

## 🚢 Deploy

### Frontend → Vercel
```bash
cd apps/web
npx vercel
```

### API → Render / Railway
Deploy `apps/api` como un servicio Node.js.

### Bot → Render / Railway
Deploy `apps/bot` como un servicio Python.

---

## 📊 Datos del Salón

| Dato | Valor |
|------|-------|
| **Nombre** | Glow Studio by Sofia |
| **Dirección** | Av. Corrientes 1234, Buenos Aires |
| **Horario** | Lun-Sáb 9:00 a 19:00 |
| **WhatsApp** | +54 11 5555-4444 |

### Servicios

| Servicio | Precio | Duración |
|----------|--------|----------|
| Corte Signature | $25.000 | 45min |
| Corte Hombre Premium | $15.000 | 30min |
| Uñas Gel Luxury | $28.000 | 1h 15min |
| Esmaltado Semi Pro | $18.000 | 45min |
| Facial Glow | $35.000 | 1h |
| Anti-frizz Keratina | $45.000 | 2h |

---

## 📄 Licencia

MIT © Glow Studio by Sofia
