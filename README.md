# stock-lan

Sistema de controle de estoque — API REST construída com Fastify, Drizzle ORM e PostgreSQL.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Bun |
| Framework | Fastify v5 |
| Linguagem | TypeScript |
| ORM | Drizzle ORM |
| Banco | PostgreSQL |
| Autenticação | JWT + Argon2 |
| Validação | Zod |
| Cache | Redis + node-cache |

## Pré-requisitos

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL
- Redis

## Setup

```bash
# Instalar dependências
bun install

# Configurar variáveis de ambiente
cp .env.example .env
# editar .env com suas credenciais

# Rodar migrations
bun run db:migrate

# Iniciar em desenvolvimento
bun run dev
```

## Variáveis de ambiente

```env
DATABASE_URL="postgres://user:pass@host:port/db_name"
JWT_SECRET="sua-chave-secreta"
JWT_EXP="7d"
ALLOWED_IPS="localhost,127.0.0.1"
ALLOWED_CORS="localhost,127.0.0.1"
REDIS_URL="redis://:pass@host:port"
SNOWFLAKE_EPOCH="2024-01-01"
```

## Scripts

```bash
bun run dev          # desenvolvimento com hot reload
bun run build        # build para produção
bun run start        # iniciar build de produção
bun run db:generate  # gerar migrations
bun run db:migrate   # executar migrations
bun run db:studio    # UI do banco (Drizzle Studio)
bun run db:reset     # resetar banco (destrutivo)
```

## Endpoints

### Auth
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/login` | — | Autenticar usuário |

### Usuários
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/first-user` | — | Criar primeiro admin |
| POST | `/users` | admin | Criar usuário |
| GET | `/users` | admin | Listar usuários |
| GET | `/users/:id` | token | Buscar por ID |
| PUT | `/users/:id` | token | Atualizar usuário |
| DELETE | `/users/:id` | admin | Deletar usuário |

### Categorias
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/categories` | token | Criar categoria |
| GET | `/categories` | token | Listar categorias |
| GET | `/categories/:id` | token | Buscar por ID |
| PUT | `/categories/:id` | token | Atualizar |
| DELETE | `/categories/:id` | token | Deletar |

### Unidades
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/units` | token | Criar unidade |
| GET | `/units` | token | Listar unidades |
| GET | `/units/:id` | token | Buscar por ID |
| PUT | `/units/:id` | token | Atualizar |
| DELETE | `/units/:id` | token | Deletar |

### Fornecedores
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/suppliers` | token | Criar fornecedor |
| GET | `/suppliers` | token | Listar fornecedores |
| GET | `/suppliers/:id` | token | Buscar por ID |
| PUT | `/suppliers/:id` | token | Atualizar |
| DELETE | `/suppliers/:id` | token | Deletar |

### Produtos
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/products` | token | Criar produto |
| GET | `/products` | token | Listar produtos |
| GET | `/products/:id` | token | Buscar por ID |
| GET | `/products/:id/movements` | token | Histórico de movimentações |
| PUT | `/products/:id` | token | Atualizar |
| DELETE | `/products/:id` | token | Deletar |

### Entradas de Estoque
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/stock-entries` | token | Registrar entrada |
| GET | `/stock-entries` | token | Listar entradas |
| GET | `/stock-entries/:id` | token | Buscar por ID |
| DELETE | `/stock-entries/:id` | token | Estornar entrada |

**Body POST `/stock-entries`:**
```json
{
  "supplier_id": "uuid (opcional)",
  "invoice_number": "NF-001 (opcional)",
  "notes": "observação (opcional)",
  "entry_date": "2026-04-27T10:00:00-03:00 (opcional)",
  "items": [
    { "product_id": "uuid", "quantity": 10, "unit_cost": 1.79 }
  ]
}
```

### Saídas de Estoque
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/stock-exits` | token | Registrar saída |
| GET | `/stock-exits` | token | Listar saídas |
| GET | `/stock-exits/:id` | token | Buscar por ID |
| DELETE | `/stock-exits/:id` | token | Estornar saída |

**Body POST `/stock-exits`:**
```json
{
  "reason": "Venda balcão",
  "destination": "Cliente (opcional)",
  "notes": "observação (opcional)",
  "exit_date": "2026-04-27T10:00:00-03:00 (opcional)",
  "items": [
    { "product_id": "uuid", "quantity": 3, "unit_price": 2.50 }
  ]
}
```

### Movimentações de Estoque
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/stock-movements` | token | Listar movimentações |

**Query params `/stock-movements`:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `product_id` | UUID | Filtrar por produto |
| `type` | `entry` \| `exit` | Filtrar por tipo |
| `start_date` | `YYYY-MM-DD` | Data inicial |
| `end_date` | `YYYY-MM-DD` | Data final |
| `utc_offset` | `±HH:MM` | Fuso horário (default: `-03:00`) |
| `limit` | number | Máximo de resultados (default: 50) |
| `offset` | number | Paginação (default: 0) |

## Banco de Dados

```
users
categories
units
suppliers
products
stock_entries
stock_entry_items
stock_exits
stock_exit_items
stock_movements
```

Diagrama: `bun run db:studio`

## Segurança

- JWT com expiração configurável
- Senhas com Argon2
- Rate limiting por IP
- Helmet (headers HTTP de segurança)
- CORS configurável
- CSRF protection
- Whitelist de IPs
