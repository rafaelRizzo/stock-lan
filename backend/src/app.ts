import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { allowsAnyCorsOrigin, corsOrigins, env } from "./config/env.js";
import { AppError, errorHandler } from "./lib/errors.js";
import { closeRedis, connectRedis } from "./lib/cache.js";
import { prisma } from "./lib/prisma.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog.routes.js";
import { registerExpensesRoutes } from "./modules/expenses/expenses.routes.js";
import { registerNotificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { registerReportsRoutes } from "./modules/reports/reports.routes.js";
import { registerSalesRoutes } from "./modules/sales/sales.routes.js";
import { registerStockRoutes } from "./modules/stock/stock.routes.js";
import { registerSuppliersRoutes } from "./modules/suppliers/suppliers.routes.js";
import { registerUsersRoutes } from "./modules/users/users.routes.js";
import { registerJwtPlugin } from "./plugins/jwt.plugin.js";

export async function buildApp() {
    const app = Fastify({ logger: env.NODE_ENV !== "test", trustProxy: true });
    app.setErrorHandler(errorHandler);

    await app.register(cors, {
        origin(origin, callback) {
            if (!origin || allowsAnyCorsOrigin || corsOrigins.includes(origin)) return callback(null, true);
            return callback(new AppError(403, "Origin not allowed"), false);
        },
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
        credentials: false,
        maxAge: 86_400,
    });
    await app.register(helmet, {
        hsts: env.NODE_ENV === "production",
        contentSecurityPolicy: false,
        referrerPolicy: { policy: "no-referrer" },
    });
    await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
    await app.register(swagger, {
        openapi: {
            info: { title: "Stock LAN API", version: "1.0.0" },
            components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
        },
    });
    await registerJwtPlugin(app);

    await registerAuthRoutes(app);
    await registerCatalogRoutes(app);
    await registerExpensesRoutes(app);
    await registerNotificationsRoutes(app);
    await registerSuppliersRoutes(app);
    await registerUsersRoutes(app);
    await registerStockRoutes(app);
    await registerSalesRoutes(app);
    await registerReportsRoutes(app);

    if (env.DOCS_ENABLED)
        await app.register(scalar, { routePrefix: "/docs", openApiDocumentEndpoints: { json: "/openapi.json" } });
    app.get("/health", { schema: { tags: ["health"] } }, () => ({ status: "ok" }));
    app.get("/ready", { schema: { tags: ["health"] } }, async () => {
        await prisma.$queryRaw`SELECT 1`;
        return { status: "ok" };
    });
    app.addHook("onClose", async () => {
        await closeRedis();
        await prisma.$disconnect();
    });
    return app;
}

export async function connectDependencies() {
    await prisma.$connect();
    await connectRedis();
}
