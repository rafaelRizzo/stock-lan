# stock-lan

Monorepo: `backend/` (Fastify + Prisma + Redis, Bun) e `frontend/` (Vite + React).

## Deploy (VPS via Docker Compose)

Pré-requisitos: Docker, rede externa `proxy` criada (usada pelo Nginx Proxy Manager ou outro reverse proxy).

```bash
docker network create proxy   # só na primeira vez, se ainda não existir
```

### Subir o projeto

```bash
docker compose --env-file frontend/.env up -d --build --force-recreate
```

- `--env-file frontend/.env`: **obrigatório**. O `VITE_API_URL` usado no build do frontend vem de `frontend/.env`, não da raiz - sem essa flag o Compose procura um `.env` na raiz e o valor fica vazio.
- `--force-recreate`: garante que containers existentes sejam recriados lendo o `.env` atualizado (o Compose não recarrega `env_file` sozinho em containers já existentes).
- `--build`: rebuilda as imagens (necessário sempre que mudar código ou `VITE_API_URL`, já que ele é embutido no bundle estático em build-time).

### Variáveis de ambiente necessárias

- `backend/.env` - runtime do container `api` (lido via `env_file:` no compose). Ver `backend/.env.example`.
  - **Sem aspas nos valores** - `env_file` do Docker Compose não interpreta aspas como shell, elas viram parte literal do valor (ex: `CORS_ORIGINS='https://...'` quebra o CORS).
- `frontend/.env` - build-time do container `web` (`VITE_API_URL`, embutido no bundle via `ARG`/`ENV` no `frontend/Dockerfile`). Ver `frontend/.env.example`.

### Containers

| Serviço | Container | Rede | Porta exposta ao host |
|---|---|---|---|
| `api` | `stock-lan-back-end` | `default`, `proxy` | nenhuma |
| `web` | `stock-lan-front-end` | `proxy` | nenhuma |
| `postgres` | `stock-lan-postgres-1` | `default` | nenhuma |
| `redis` | `stock-lan-redis-1` | `default` | nenhuma |

Nenhum serviço expõe porta no host - tudo é acessado via reverse proxy (NPM ou similar) conectado à rede externa `proxy`, apontando pro hostname do container (ex: `stock-lan-back-end:3333`, `stock-lan-front-end:80`).

### Migração de banco (Prisma)

```bash
cd backend
bunx prisma migrate deploy   # aplica migrations pendentes, não pede confirmação
```
