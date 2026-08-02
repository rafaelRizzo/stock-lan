FROM oven/bun:1.3.14-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
EXPOSE 3333
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/server.ts"]
