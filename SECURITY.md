# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability within Glow Studio by Sofia, please do **NOT** open a public issue on GitHub.

Instead, please send an email directly to the project security contact:
- **Email:** `hola@glowstudio.com`
- **Subject:** `[SECURITY] Vulnerability Report - Glow Studio`

Please include:
- A description of the vulnerability and its potential impact.
- Steps to reproduce or proof-of-concept.
- Any suggested mitigations.

We will acknowledge receipt within 48 hours and work on a fix promptly.

## Security Practices

- **Zero-Secret Commits:** All secrets, keys, and tokens must reside exclusively in environment variables and never be committed to source control.
- **HMAC Verification:** Webhook endpoints validate Meta signatures (`x-hub-signature-256`) using timing-safe comparisons.
- **Role-Based Access Control:** All administrative endpoints require valid JWT authentication with `ADMIN` role or private `x-api-key`.
- **Database Safety:** SQL queries are parameterized via Prisma ORM and psycopg2 to prevent SQL injection.
