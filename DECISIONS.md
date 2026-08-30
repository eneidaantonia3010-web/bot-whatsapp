# 📋 Architecture Decision Records (ADRs) — Glow Studio by Sofia

> **Standard:** [MADR (Markdown Architectural Decision Records) v3.0.0](https://adr.github.io/madr/)  
> **Status:** Living Document  
> **Project:** Glow Studio by Sofia Omnichannel Beauty Platform  

Este documento registra las decisiones arquitectónicas fundamentales tomadas en el diseño e implementación de la plataforma, detallando el contexto, las alternativas evaluadas, el fundamento técnico y sus consecuencias.

---

## 📑 Registro de Decisiones

- [ADR-001: Next.js 16 App Router y React 19 en Frontend](#adr-001-nextjs-16-app-router-y-react-19-en-frontend)
- [ADR-002: Servicio de WhatsApp Nativo con Baileys y Almacenamiento de Sesión en PostgreSQL](#adr-002-servicio-de-whatsapp-nativo-con-baileys-y-almacenamiento-de-sesión-en-postgresql)
- [ADR-003: Validación Universal en Tiempo de Ejecución con Zod y Esquemas Compartidos](#adr-003-validación-universal-en-tiempo-de-ejecución-con-zod-y-esquemas-compartidos)
- [ADR-004: Estrategia de Pruebas Multi-Capa con Vitest, Supertest y Pytest](#adr-004-estrategia-de-pruebas-multi-capa-con-vitest-supertest-y-pytest)
- [ADR-005: Agente de IA Conversacional en Python FastAPI con Pool de Modelos en Groq Cloud](#adr-005-agente-de-ia-conversacional-en-python-fastapi-con-pool-de-modelos-en-groq-cloud)

---

## ADR-001: Next.js 16 App Router y React 19 en Frontend

### Estado
**Aceptado** (2026-08-14)

### Contexto y Planteamiento del Problema
El frontend de Glow Studio requiere ofrecer una experiencia visual de alto estándar para un salón de belleza premium: carga instantánea de catálogo, animaciones fluidas de Framer Motion / Motion, reserva interactiva de turnos sin parpadeo de pantalla, panel de administración en tiempo real y portal de autogestión de citas para clientes móviles.

La aplicación necesitaba una arquitectura moderna que combinara renderizado en servidor (SSR) para SEO de catálogo, componentes reactivos en cliente con actualizaciones optimistas y soporte offline / PWA.

### Factores de Decisión (Drivers)
- Rendimiento y Core Web Vitals (LCP < 1.2s, CLS < 0.05).
- Compatibilidad con React 19 (`useOptimistic`, Server Actions y Actions).
- Integración nativa con TailwindCSS v4 y Radix UI.
- Despliegue estandarizado y optimizado en Vercel o Render Web.

### Opciones Consideradas
1. **Next.js 16 con App Router y React 19**
2. **Single Page Application (SPA) tradicional con Vite + React 18**
3. **Remix / React Router v7**

### Resultado de la Decisión
Se eligió **Next.js 16 con App Router y React 19**.

#### Justificación
- El App Router permite segmentar de forma nativa las páginas públicas (SEO optimizado, SSR) de los módulos altamente interactivos como el calendario y el panel de administración (`'use client'`).
- La integración de React 19 con `useOptimistic` permite reflejar de forma inmediata la selección y cancelación de turnos en la interfaz antes de esperar la respuesta de red del servidor, mejorando la percepción de velocidad.
- Permite servir el Service Worker y el manifiesto PWA directamente desde la carpeta `public/` con caché estática agresiva.

### Consecuencias
#### Positivas:
- Carga inicial extremadamente rápida con streaming de componentes y skeleton fallbacks.
- Separación limpia entre lógica de servidor y componentes de interfaz.
- Compatibilidad nativa con TypeScript y compilador Turbopack.

#### Negativas / Retos:
- Mayor disciplina en la delimitación de boundaries (`'use client'` vs Server Components).
- Necesidad de asegurar que librerías de UI de terceros soporten el ciclo de vida de React 19.

---

## ADR-002: Servicio de WhatsApp Nativo con Baileys y Almacenamiento de Sesión en PostgreSQL

### Estado
**Aceptado** (2026-08-20)

### Contexto y Planteamiento del Problema
Para la atención automatizada de clientes del salón en Argentina, WhatsApp es el canal con mayor tasa de conversión (>85% de las reservas). 

Las soluciones tradicionales se dividían entre:
1. Pasarelas de terceros basadas en suscripción mensual en dólares (Evolution API alojada, Z-API, Twilio for WhatsApp).
2. Clientes locales de WhatsApp Web basados en Puppeteer / Chromium (alto consumo de memoria RAM > 1.2GB y suspensiones constantes en planes gratuitos de Render).
3. Conexión WebSocket directa y ligera mediante `@whiskeysockets/baileys`.

Adicionalmente, dado que los servidores en plataformas PaaS (Render Free Tier) reinician sus instancias y destruyen el sistema de archivos efímero, las credenciales de WhatsApp guardadas en disco local se perdían, obligando a escanear el código QR en cada reinicio.

### Factores de Decisión (Drivers)
- **Cero costo recurrente** de pasarelas intermedias de WhatsApp.
- **Bajo consumo de memoria RAM** (< 150MB para operar en contenedores de 512MB).
- **Persistencia inmutable de la sesión:** La sesión de WhatsApp debe sobrevivir reinicios y despliegues sin requerir re-escaneo del código QR.
- **Soporte de Pairing Code y simulación de presencia natural** para prevenir baneos de número.

### Opciones Consideradas
1. **Baileys Nativo con Adaptador de Sesión Personalizado en PostgreSQL (`baileys_sessions`)**
2. **Servicio externo Evolution API en contenedor Docker independiente**
3. **WhatsApp Cloud API Oficial (Meta Business Platform)**

### Resultado de la Decisión
Se eligió **Baileys Nativo integrado directamente en Express API con adaptador `baileys-store.ts` sobre Neon PostgreSQL**.

#### Justificación
- Elimina la necesidad de desplegar y mantener un segundo contenedor para Evolution API.
- La tabla `baileys_sessions` almacena las claves criptográficas mediante serialización binaria segura (`BufferJSON.replacer` y `BufferJSON.reviver`). Al arrancar el servidor Node.js, `usePrismaAuthState()` carga instantáneamente las claves Noise y el token de sesión, restableciendo el WebSocket en menos de 2 segundos.
- Control total sobre el algoritmo de reconexión con backoff exponencial y jitter gaussiano, simulación de estados de presencia (`composing`), y cola persistente de salida (`message_queue`).

### Consecuencias
#### Positivas:
- Consumo de RAM inferior a 120MB en el backend.
- Cero deslogueos ante reinicios programados del servidor en Render.
- Capacidad de vincular el salón tanto con código QR en vivo en `/admin` como con código de 8 dígitos (`requestPairingCode`).

#### Negativas / Retos:
- Se debe monitorear el protocolo no oficial de WhatsApp y actualizar la librería `@whiskeysockets/baileys` cuando Meta modifique versiones del handshake.
- Requiere un algoritmo estricto de mitigación de spam (pausa de seguridad de 1 hora ante código HTTP 403).

---

## ADR-003: Validación Universal en Tiempo de Ejecución con Zod y Esquemas Compartidos

### Estado
**Aceptado** (2026-08-16)

### Contexto y Planteamiento del Problema
En una plataforma políglota y multicanal donde los datos provienen de formularios web, eventos webhook de Instagram, mensajes de texto de WhatsApp interpretados por un LLM y llamadas administrativas internas, la corrupción de datos o la falta de validación de tipos en runtime genera errores silenciosos en cascada (e.g. fechas inválidas que bloquean el calendario, números de teléfono mal formateados o inyecciones en parámetros).

TypeScript solo ofrece verificación estática en tiempo de compilación, desapareciendo en tiempo de ejecución.

### Factores de Decisión (Drivers)
- Tipado seguro de extremo a extremo (End-to-End Type Safety).
- Inferencia automática de tipos TypeScript (`z.infer<typeof schema>`).
- Validación unificada para:
  1. Parámetros de configuración de entorno (`apps/api/src/config.ts`).
  2. Cargas útiles de peticiones HTTP REST (`apps/api/src/schemas/`).
  3. Contratos de clientes web.

### Opciones Consideradas
1. **Zod (v3/v4)**
2. **Joi / Yup**
3. **TypeBox / Ajv**

### Resultado de la Decisión
Se eligió **Zod** como la librería estándar de validación en tiempo de ejecución para toda la capa TypeScript del proyecto.

#### Justificación
- Zod permite definir esquemas declarativos con refinamientos complejos (ej. validación ISO-8601 de fechas con `Date.parse`, sanitización de teléfonos y límites de longitud).
- La validación del archivo de configuración `config.ts` valida todas las variables de entorno obligatorias al inicio del proceso Node.js; si falta una variable crítica en producción (como `JWT_SECRET` o `DATABASE_URL`), el proceso aborta de inmediato con un mensaje descriptivo en lugar de fallar en runtime.

### Consecuencias
#### Positivas:
- Eliminación de errores de tipo `undefined` o formatos de fecha corruptos en la base de datos.
- Reutilización de los mismos esquemas para la validación de peticiones y la generación de tipos TypeScript.
- Respuestas HTTP 400 coherentes y estandarizadas con mensajes de error amigables.

#### Negativas / Retos:
- Pequeño sobrecosto de cómputo en la deserialización de payloads muy grandes (despreciable en cargas de trabajo del salón).

---

## ADR-004: Estrategia de Pruebas Multi-Capa con Vitest, Supertest y Pytest

### Estado
**Aceptado** (2026-08-22)

### Contexto y Planteamiento del Problema
El monorepo cuenta con servicios en dos lenguajes distintos (TypeScript/Node.js y Python) que deben interactuar de forma transaccional. Se requería una suite de pruebas automatizadas que fuera rápida de ejecutar en local (menor a 15 segundos en total) y que validara desde reglas de negocio aisladas (validación de turnos, solapamiento) hasta la integración de middleware de autenticación y flujos conversacionales completos de la IA.

### Factores de Decisión (Drivers)
- Velocidad de ejecución en desarrollo y pipelines de CI.
- Compatibilidad nativa con ESM y TypeScript sin transpiladores pesados (eliminando Jest + Babel).
- Capacidad de simular llamadas HTTP en memoria sin levantar puertos reales (`supertest`).
- Cobertura de la matriz conversacional del bot de IA en Python.

### Opciones Consideradas
1. **Vitest en `apps/api` y `apps/web` + Pytest en `apps/bot`**
2. **Jest + ts-jest en Node + Unittest en Python**
3. **Playwright E2E exclusivo**

### Resultado de la Decisión
Se eligió **Vitest para los paquetes de Node (`apps/api`, `apps/web`) y Pytest para el paquete de Python (`apps/bot`)**, orquestados por scripts raíz en `package.json`.

#### Justificación
- **Vitest** aprovecha la arquitectura Vite/Rollup y es hasta 10 veces más rápido que Jest en ejecución de tests unitarios y de integración con TypeScript.
- **Supertest** permite testear los enrutadores de Express API de forma aislada sin abrir sockets de red TCP, facilitando el mockeo de Prisma y servicios de calendario.
- **Pytest** con `pytest-asyncio` permite probar de forma determinista la máquina de estados del bot, el clasificador de intenciones y los fallbacks de Groq.

### Consecuencias
#### Positivas:
- Los ingenieros pueden validar el 100% del monorepo en su máquina local con un único comando (`npm run validate:all`).
- Tiempo de ejecución de la suite completa inferior a 12 segundos.
- Detección temprana de regresiones en esquemas Zod o enrutamiento.

#### Negativas / Retos:
- Los desarrolladores deben tener instalados ambos entornos de ejecución (Node y Python) para ejecutar la suite completa en local.

---

## ADR-005: Agente de IA Conversacional en Python FastAPI con Pool de Modelos en Groq Cloud

### Estado
**Aceptado** (2026-08-14, actualizado 2026-08-30)

### Contexto y Planteamiento del Problema
La interacción con clientes en belleza y estética demanda una conversación natural, empática y precisa en 3 idiomas (Español rioplatense, Portugués e Inglés). 

Los requerimientos del bot incluyen:
1. Respuesta en tiempo real por WhatsApp (< 2 segundos de latencia).
2. Capacidad de transcribir notas de voz enviadas por clientes.
3. Capacidad de "ver" e interpretar fotos de peinados o uñas enviadas como referencia estética.
4. Memoria semántica del cliente (e.g. "prefiere rubio ceniza, suele atenderse con Sofía los sábados").
5. Alta disponibilidad: Si una clave o modelo de IA sufre rate-limit o caída, el sistema debe degradar a un modelo secundario sin fallar al cliente.

### Factores de Decisión (Drivers)
- **Latencia de Inferencia:** Tiempos de generación inferiores a 800ms por token en LLMs de 70B parámetros.
- **Soporte Multimodal:** Modelos de visión (LLaMA 3.2 Vision) y audio (Whisper).
- **Control Fino en Python:** Facilidad de integración de librerías lingüísticas como `dateparser` para expresiones temporales complejas ("el próximo jueves a las 3 y media de la tarde").

### Opciones Consideradas
1. **Python FastAPI + Groq Cloud LPU Pool (LLaMA 3.3 70B, LLaMA 3.1 8B, Whisper Large v3, LLaMA 3.2 Vision)**
2. **OpenAI GPT-4o / GPT-3.5 API**
3. **Servicio monolítico en TypeScript con LangChain.js**

### Resultado de la Decisión
Se eligió **un microservicio independiente en Python FastAPI (`apps/bot`) conectado a Groq Cloud LPUs**.

#### Justificación
- **Velocidad sin rival:** Los procesadores LPU de Groq entregan inferencia de LLaMA 3.3 70B a más de 250 tokens/segundo, permitiendo una experiencia conversacional instantánea en WhatsApp.
- **Arquitectura de Pool Resiliente (`llm_pool.py`):** El bot utiliza un pool balanceado de API keys y un mecanismo de fallback: si el modelo primario `llama-3.3-70b-versatile` no responde o sufre rate-limit, conmuta automáticamente a `llama-3.1-8b-instant`.
- **Ecosistema Multimodal Completo:** Whisper Large v3 Turbo para audios de WhatsApp y LLaMA 3.2 11B Vision para fotos de referencia, unificados bajo el mismo proveedor de inferencia de baja latencia.

### Consecuencias
#### Positivas:
- Experiencia de usuario en WhatsApp indistinguible de una recepcionista humana experta.
- Costo de inferencia significativamente más bajo que proveedores propietarios tradicionales.
- Tolerancia a fallos con scoring de confianza (`confidence >= 0.70`) y escalación automática a un humano tras 3 fallos consecutivos.

#### Negativas / Retos:
- Dependencia del uptime de Groq Cloud (mitigada por la presencia de modelos alternativos y respuestas estáticas de FAQ).
- Requiere autenticación mutua segura (`x-api-key`) entre Express API y FastAPI.

---

*Fin del registro de decisiones de arquitectura.*
