# Plano do Backend

## Stack

- Bun, TypeScript 7, Fastify, Prisma, PostgreSQL 16 e Redis.
- IDs `cuid()` em todos os modelos.
- Valores monetários como `Decimal(14,2)`, nunca `Float`.
- `createdAt @default(now())` e `updatedAt @updatedAt`.
- Bun como runtime, gerenciador de pacotes e executor de scripts.
- Biome para lint, organização de imports e formatação com 4 espaços.
- `@fastify/swagger`, `@scalar/fastify-api-reference`, `@fastify/cors` e `@fastify/helmet`.
- Dependências usam versões explícitas com `^`, nunca `latest`.
- Docker Compose para API, PostgreSQL, Redis e worker opcional.
- JWT curto e refresh token hasheado em `UserSession`.
- Senhas com Argon2id.
- Dados financeiros não são apagados, usam status e movimentos de reversão.

## Convenções

- Todo cadastro possui: `id`, `createdUserId`, `createdAt`, `updatedAt` e `status` quando aplicável.
- `createdUserId` referencia `User` e recebe índice.
- Datas de criação recebem índice.
- Usar `EntityStatus`: `ACTIVE`, `INACTIVE`, `ARCHIVED`.
- Criar tabela `Audit` para ação, entidade, dados anteriores/novos, usuário e data.

## Domínio

| Requisito | Modelo |
| --- | --- |
| Quantitites | `QuantityType` |
| Revenders | `Supplier` |
| Debitteres | `Debtor` |
| Stocks | `StockBatch` |
| Movimentations | `StockMovement` |
| Despesas recorrentes | `ExpenseTemplate` |
| Despesas lançadas | `Expense` |
| Notificações | `Notification`, `NotificationRead` |

Não usar somente movimentação para registrar vendas. Vendas possuem cabeçalho em `Sale`, itens em `SaleItem`, pagamentos em `Payment` e reflexo imutável em `StockMovement`.

## Modelagem Prisma

```prisma
enum EntityStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum UserRole {
  ADMIN
  MANAGER
  OPERATOR
}

enum StockMovementType {
  IN
  OUT
  ADJUSTMENT
  REVERSAL
}

enum SaleStatus {
  PAID
  PENDING
  FREE
  DEBT
  CANCELED
}

enum ExpenseRecurrence {
  ONE_TIME
  WEEKLY
  MONTHLY
  YEARLY
}

model User {
  id           String       @id @default(cuid())
  name         String       @unique
  username     String       @unique
  passwordHash String
  photo        String?
  obs          String?
  role         UserRole     @default(OPERATOR)
  status       EntityStatus @default(ACTIVE)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([status])
  @@index([createdAt])
}

model QuantityType {
  id            String       @id @default(cuid())
  name          String       @unique
  status        EntityStatus @default(ACTIVE)
  createdUserId String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([status])
  @@index([createdUserId])
  @@index([createdAt])
}

model Supplier {
  id            String       @id @default(cuid())
  name          String       @unique
  phone         String?
  obs           String?
  status        EntityStatus @default(ACTIVE)
  createdUserId String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([status])
  @@index([createdUserId])
  @@index([createdAt])
}

model Product {
  id            String       @id @default(cuid())
  name          String       @unique
  priceSell     Decimal      @db.Decimal(14, 2)
  obs           String?
  status        EntityStatus @default(ACTIVE)
  createdUserId String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([status])
  @@index([createdUserId])
  @@index([createdAt])
}

model StockBatch {
  id             String       @id @default(cuid())
  supplierId     String
  productId      String
  quantityTypeId String
  quantityIn     Decimal      @db.Decimal(14, 3)
  quantityLeft   Decimal      @db.Decimal(14, 3)
  priceBuy       Decimal      @db.Decimal(14, 2)
  dateBuy        DateTime     @db.Date
  notifyLimit    Boolean      @default(false)
  quantityNotify Decimal?     @db.Decimal(14, 3)
  obs            String?
  status         EntityStatus @default(ACTIVE)
  createdUserId  String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([supplierId])
  @@index([productId, quantityLeft])
  @@index([quantityTypeId])
  @@index([dateBuy])
  @@index([notifyLimit, quantityLeft])
  @@index([createdUserId])
  @@index([createdAt])
}
```

Modelos complementares obrigatórios:

- `Debtor`: nome único, telefone, observação, status e auditoria.
- `Sale`: cliente, status, total, `debtorId` opcional e auditoria.
- `SaleItem`: `saleId`, `productId`, `stockBatchId`, quantidade, preço unitário e total.
- `StockMovement`: produto, lote, tipo, quantidade, custos, `saleId` opcional e auditoria.
- `Payment`: `saleId`, valor, data, método e auditoria.
- `ExpenseTemplate`: nome único, recorrência, valor padrão, `anchorDate` (data âncora da recorrência) e `nextDueDate` (próxima ocorrência calculada), status e auditoria. `anchorDate` é obrigatório quando `recurrence != ONE_TIME`.
- `Expense`: template opcional, nome, valor, vencimento, status e auditoria.
- `Notification`: tipo, título, mensagem, entidade e id referenciados, data de criação. Broadcast (sem dono), visível a quem gerencia o domínio da entidade referenciada.
- `NotificationRead`: notificação, usuário e data de leitura. Existência do registro = notificação lida por aquele usuário; único por `(notificationId, userId)`.
- `UserSession`: usuário, hash do token, expiração, revogação e auditoria.
- `Audit`: usuário, entidade, id da entidade, ação, payload anterior/novo e data.

## Regras de negócio

- Criar venda, itens, baixa FIFO dos lotes e `StockMovement` dentro de uma única `prisma.$transaction`.
- Nunca permitir `quantityLeft < 0`.
- Cancelamento cria movimento `REVERSAL`, não remove dados.
- Venda `DEBT` exige `debtorId`.
- Venda `FREE` baixa estoque sem cobrança.
- `PENDING` e `DEBT` permitem pagamentos parciais.
- Estoque disponível: soma de `quantityLeft` por produto.
- Alerta de estoque: `notifyLimit = true` e `quantityLeft <= quantityNotify`.
- `Expense.status = PENDING` nunca conta em fluxo de caixa, lucro ou relatórios: somente `PAID` com `paidAt` preenchido é somado. Não debita nada até o usuário dar baixa manualmente.
- Job diário (`runExpenseRecurrenceJob`) gera automaticamente uma `Expense PENDING` + uma `Notification` para todo `ExpenseTemplate ACTIVE` com `recurrence != ONE_TIME` e `nextDueDate <= hoje`, depois avança `nextDueDate` pra próxima ocorrência.
- Arquivar um `ExpenseTemplate` recorrente não gera mais despesas (job filtra só `status: ACTIVE`); restaurar recalcula `nextDueDate` a partir da data atual, para não lançar uma despesa retroativa de surpresa.
- Cálculo de próxima ocorrência (`src/lib/recurrence.ts`) é feito por diferença de calendário a partir da `anchorDate`, com clamp para o último dia do mês/ano quando o dia âncora não existe no período (ex.: dia 31 em fevereiro, 29/02 em ano não bissexto).

## Paginação

Usar paginação por página e limite em todas as listagens.

```txt
GET /products?page=1&limit=20&sort=createdAt&order=desc&search=caixa&status=ACTIVE
```

Contrato:

```ts
type PaginatedResponse<T> = {
  data: T[]
  total: number
  totalPage: number
  page: number
  limit: number
}
```

Regras:

- `page` padrão `1`, mínimo `1`; `limit` padrão `20`, mínimo `1`, máximo `100`.
- Consulta Prisma: `skip: (page - 1) * limit`, `take: limit` e `count()` para retornar o total.
- Ordenação padrão `createdAt DESC, id DESC`; `sort` e `order` aceitam apenas valores permitidos por endpoint.
- Índices de listas principais: `[status, createdAt, id]`, `[productId, createdAt, id]`, `[saleId, createdAt, id]`, `[debtorId, createdAt, id]`.

## API

```txt
POST   /auth/login
GET    /auth/setup
POST   /auth/setup
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

CRUD   /users
CRUD   /products
CRUD   /quantity-types
CRUD   /suppliers
CRUD   /debtors
CRUD   /expense-templates
CRUD   /expenses

POST   /stock/batches
GET    /stock/products/:productId
POST   /stock/adjustments
GET    /stock/alerts

POST   /sales
GET    /sales
GET    /sales/:id
POST   /sales/:id/payments
POST   /sales/:id/cancel

GET    /reports/dashboard
GET    /reports/sales
GET    /reports/profit
GET    /reports/expenses
GET    /reports/debts

GET    /notifications
GET    /notifications/unread-count
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
```

Todos os `GET` de coleção implementam o contrato de paginação. `GET /reports/dashboard` não é paginado por ser agregado.

`CRUD` inclui archive (`DELETE /:resource/:id`, seta `status: ARCHIVED`) e restore (`PATCH /:resource/:id/restore`, volta `status: ACTIVE`), além de `DELETE /:resource/:id/permanent` para exclusão definitiva (role `ADMIN`). `/users` não expõe `permanent`.

## Documentação, CORS e segurança

- OpenAPI 3.1 gerado por `@fastify/swagger`, com schemas de request, response, erro e autenticação Bearer.
- Especificação disponível em `GET /docs/openapi.json`.
- Interface Scalar disponível em `GET /docs`, consumindo `/docs/openapi.json`.
- Em produção, proteger `/docs` e `/docs/openapi.json` por perfil `ADMIN`, ou desabilitá-los por `DOCS_ENABLED=false`.
- CORS via `@fastify/cors`, com `origin` validado pela lista `CORS_ORIGINS`, métodos `GET,POST,PATCH,DELETE`, headers `Authorization,Content-Type` e `credentials: false` por padrão.
- Habilitar `credentials: true` apenas com origens explícitas, nunca com origem curinga.
- Headers via `@fastify/helmet`: HSTS somente em produção HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` e CSP restritiva se a API servir conteúdo HTML.
- Adicionar rate limit por IP e usuário nas rotas de autenticação e mutação.

## Testes

- Runner: `bun test`, com cobertura mínima de 100% para statements, branches, functions e lines.
- Unitários: services, schemas Zod, paginação por página, cálculo de totais, permissões e cache. Dependências externas mockadas.
- Integração: Fastify com `app.inject()`, PostgreSQL e Redis isolados em Docker/Testcontainers, migrations aplicadas antes da suíte.
- Cada teste de integração executa em transação revertida ou banco recriado, sem compartilhar estado.
- Cobrir obrigatoriamente: autenticação e refresh, RBAC, CRUD paginado, filtros, venda com múltiplos itens, baixa FIFO, estoque insuficiente, pagamentos parciais, venda a prazo, cancelamento com reversão, alerta de estoque e CORS.
- Testar erros: payload inválido, usuário sem permissão, recurso inexistente, conflito de unicidade, página ou limite inválidos.
- CI bloqueia merge abaixo de 100%: `bun run lint`, `bun run typecheck`, `bun test --coverage` e testes de integração.

## Jobs / Cron

- `node-cron` in-process (processo único, sem worker separado): `src/server.ts` roda `runExpenseRecurrenceJob()` uma vez no boot e agenda `*/10 * * * *` (a cada 10 minutos). Cadência curta é viável porque o job é barato (uma query + claim por template vencido) e idempotente.
- Idempotência via SQL, sem lock externo: cada `ExpenseTemplate` vencido é reivindicado com um `updateMany({ where: { id, nextDueDate: <valor lido> }, data: { nextDueDate: <próximo> } })`. Se `count === 0`, outro processo já avançou esse registro nesse instante e o item é ignorado. O Postgres serializa a linha durante o `UPDATE`, então isso cobre execuções concorrentes ou repetidas no mesmo dia sem precisar de Redis.
- `runExpenseRecurrenceJob` (`src/jobs/expense-recurrence.job.ts`): busca `ExpenseTemplate` vencidos, reivindica cada um via `updateMany`, cria `Expense` + `Notification` só se a reivindicação for bem-sucedida, invalida `dashboard`, `reports:` e `catalog:expenseTemplate:`.

## Cache

- Redis: rate limit, sessões, cache compartilhado e fila de alertas.
- NodeCache: cache L1 para cadastros pouco mutáveis, TTL de 30 a 120 segundos.
- Invalidar após mutações: `product:{id}`, `stock:product:{id}`, `dashboard:*`.
- Não cachear saldo de estoque sem invalidação transacional.
- NodeCache L1 em todos os GETs de catálogo, estoque, vendas e relatórios. `GET /auth/me` permanece sem cache por segurança.
- Create, update, archive/delete, pagamento, ajuste e cancelamento invalidam chaves diretas e prefixos relacionados.

## Estrutura

```txt
src/
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
    stock/
      stock.routes.ts
      stock.controller.ts
      stock.service.ts
    sales/
      sales.routes.ts
      sales.controller.ts
      sales.service.ts
    notifications/
      notifications.routes.ts
      notifications.controller.ts
      notifications.service.ts
      notifications.schemas.ts
  jobs/
    expense-recurrence.job.ts
  lib/
    recurrence.ts
  plugins/
    prisma.ts
    redis.ts
    auth.ts
    cache.ts
    cors.ts
    security.ts
    swagger.ts
  test/
    unit/
    integration/
  shared/
    pagination/
    errors/
    schemas/
prisma/
  schema.prisma
  migrations/
```

- `routes`: somente método, URL, schemas, middlewares e controller.
- `controllers`: extraem dados HTTP, chamam services e definem status HTTP.
- `services`: regras de negócio, transações, cache e acesso ao Prisma.
- O Prisma é a camada de modelo, portanto não criar diretório ou classes `models`.

## Padrão de código

- Cada domínio segue obrigatoriamente: `module.controller.ts`, `module.routes.ts`, `module.schemas.ts` e `module.service.ts`.
- Não usar classes em controllers ou services. Exportar objetos e funções arrow.
- Não usar `.bind()`. Controllers são objetos com handlers arrow ou factories que retornam handlers arrow.
- Schemas Zod ficam no próprio módulo, nunca em pasta global compartilhada.
- Rotas não acessam Prisma, cache ou regras de negócio diretamente.
- Services concentram Prisma, transações, cache e invalidação.
- Rotas usam sempre este formato vertical:

```ts
app.get(
    "/resource",
    {
        preHandler: authenticate,
        schema: { tags: ["resource"] },
    },
    controller.list,
);
```

- O Biome aplica 4 espaços globalmente e largura de linha menor para `*.routes.ts`, preservando rotas em múltiplas linhas.

## Padrão de cache

- `node-cache` é L1 local por instância; Redis é L2 compartilhado.
- Todos os GETs de catálogo, estoque, vendas e relatórios usam L1 via `getOrSetLocal`.
- `GET /auth/me` não usa cache por segurança e revogação imediata.
- Cada mutação invalida a chave direta e os prefixos dependentes: create, update, archive/delete, pagamento, ajuste e cancelamento.
- Prefixos: `catalog:<entity>:`, `stock:`, `sales:`, `reports:`.

## Licença

- MIT para ampla adoção, ou AGPL-3.0 para exigir publicação de alterações em serviços derivados.
