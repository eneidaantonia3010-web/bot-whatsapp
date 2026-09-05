# AGENTS.md

Read [CONSTRAINTS.md](file:///c:/Users/herct/Desktop/mi-bot-whatsapp/CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

## Project Structure & Context

- `apps/web`: Next.js 16 + React 19 web application (frontend + salon booking wizard).
- `apps/api`: Express + TypeScript backend REST API (Prisma ORM, Baileys WhatsApp integration).
- `apps/bot`: Python 3.11 FastAPI / Groq AI conversational agent.
- `prisma/schema.prisma`: Shared database schema and migrations.

## Quality Standards & Verification

- **Fast Check (during edits):** `npm run check:fast` (type check + floor guard).
- **Task Verification (end of task):** `npm run check:task` (fast check + test suites).
- **Full CI Pipeline:** `npm run check:full` (types, tests with coverage, and builds).
