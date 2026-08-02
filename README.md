# stock-lan

Monorepo: `backend/` (Fastify + Prisma + Redis, Bun) e `frontend/` (Vite + React).

## Desenvolvimento local

```bash
# backend
cd backend
cp .env.example .env
bun install
bunx prisma generate
bunx prisma migrate dev
bun dev              # http://localhost:3333

# frontend
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

## Deploy (VPS via Docker Compose)

```bash
docker network create proxy   # só na primeira vez
docker compose --env-file frontend/.env up -d --build --force-recreate
```

- `backend/.env` e `frontend/.env` precisam existir (ver `.env.example` de cada um). Valores sem aspas em `backend/.env` - o Compose não interpreta aspas.
- `--env-file frontend/.env`: obrigatório, é de onde vem o `VITE_API_URL` do build.
- `--force-recreate`: Compose não recarrega `env_file` sozinho em containers existentes.
- `--build`: necessário sempre que mudar código ou `VITE_API_URL`.

Migração de banco em produção:

```bash
cd backend && bunx prisma migrate deploy
```
