# AGENTS.md

Read [CONSTRAINTS.md](file:///c:/Users/herct/Desktop/mi-bot-whatsapp/CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.
Always consult [MEMORY.md](file:///c:/Users/herct/Desktop/mi-bot-whatsapp/MEMORY.md) for technical memory, project decisions, and operational protocols.

## 🛑 Protocolo Obligatorio de Cuentas Render (Memoria Permanente)

El proyecto utiliza **3 cuentas gratuitas independientes de Render**, cada una asignada a un servicio específico:
- **Cuenta 1 (Web):** `eneidaantonia3010@gmail.com` ➔ Frontend Web (`glow-studio-web`)
- **Cuenta 2 (API):** `restrepojivana7@gmail.com` ➔ Backend API REST (`glow-studio-api`)
- **Cuenta 3 (Bot):** `superfruitas301083@gmail.com` ➔ Bot de IA WhatsApp (`glow-studio-bot`)

**Reglas Críticas para todo Agente:**
1. **NUNCA** asumir, adivinar ni ingresar automáticamente a una cuenta de Render.
2. **SIEMPRE** pedir confirmación explícita al usuario indicando el correo y el servicio correspondiente antes de ejecutar cualquier acción de navegación, login, o despliegue en Render.
3. Consultar siempre la memoria ([MEMORY.md](file:///c:/Users/herct/Desktop/mi-bot-whatsapp/MEMORY.md) y `agent-memory`) ante cualquier duda sobre despliegues o infraestructura.

## Project Structure & Context

- `apps/web`: Next.js 16 + React 19 web application (frontend + salon booking wizard).
- `apps/api`: Express + TypeScript backend REST API (Prisma ORM, Baileys WhatsApp integration).
- `apps/bot`: Python 3.11 FastAPI / Groq AI conversational agent.
- `prisma/schema.prisma`: Shared database schema and migrations.

## Quality Standards & Verification

- **Fast Check (during edits):** `npm run check:fast` (type check + floor guard).
- **Task Verification (end of task):** `npm run check:task` (fast check + test suites).
- **Full CI Pipeline:** `npm run check:full` (types, tests with coverage, and builds).
