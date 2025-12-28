# Vision NGO Backend (scaffold)

This is a scaffold for the Vision NGO Management System backend.

Tech stack:
- Node.js + TypeScript + Express
- PostgreSQL (Prisma)
- Docker / docker-compose for local dev

Quick start (local):
1. Copy `.env.example` to `.env` and update variables.
2. Start db + backend using Docker Compose: `docker-compose up --build`
3. In another terminal you can run migrations (Prisma) after installing dependencies.

Notes:
- The `auth` route is a placeholder and should be replaced with secure implementations using the DB and hashed passwords.
- CI workflow is included under `.github/workflows/ci.yml`.
