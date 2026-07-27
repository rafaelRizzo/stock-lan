import { expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

type Route = { method: string; url: string };

function createAppRecorder() {
    const routes: Route[] = [];
    const register = (method: string) => (url: unknown) => {
        routes.push({ method, url: String(url) });
    };
    const app = {
        get: register("GET"),
        post: register("POST"),
        patch: register("PATCH"),
        delete: register("DELETE"),
    } as unknown as FastifyInstance;
    return { app, routes };
}

test("registers auth routes", async () => {
    const { registerAuthRoutes } = await import("../../src/modules/auth/auth.routes.js");
    const { app, routes } = createAppRecorder();
    await registerAuthRoutes(app);
    expect(routes).toEqual([
        { method: "POST", url: "/auth/login" },
        { method: "GET", url: "/auth/setup" },
        { method: "POST", url: "/auth/setup" },
        { method: "POST", url: "/auth/refresh" },
        { method: "POST", url: "/auth/logout" },
        { method: "GET", url: "/auth/me" },
    ]);
});

test("registers stock routes", async () => {
    const { registerStockRoutes } = await import("../../src/modules/stock/stock.routes.js");
    const { app, routes } = createAppRecorder();
    await registerStockRoutes(app);
    expect(routes.map((route) => route.url)).toEqual([
        "/stock/batches",
        "/stock/batches",
        "/stock/batches/:id",
        "/stock/batches/:id",
        "/stock/batches/:id",
        "/stock/products/:productId",
        "/stock/adjustments",
        "/stock/alerts",
        "/stock/movements",
    ]);
});

test("registers sales and reports routes", async () => {
    const [{ registerSalesRoutes }, { registerReportsRoutes }] = await Promise.all([
        import("../../src/modules/sales/sales.routes.js"),
        import("../../src/modules/reports/reports.routes.js"),
    ]);
    const { app, routes } = createAppRecorder();
    await registerSalesRoutes(app);
    await registerReportsRoutes(app);
    expect(routes.map((route) => route.url)).toEqual([
        "/sales",
        "/sales",
        "/sales/:id",
        "/sales/:id",
        "/sales/:id",
        "/sales/:id/payments",
        "/sales/:id/cancel",
        "/reports/dashboard",
        "/reports/debts",
    ]);
});
