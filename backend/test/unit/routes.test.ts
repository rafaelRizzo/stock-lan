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
        "/stock/no-cost",
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
        "/reports/debtors/:debtorId/statement",
        "/reports/debtors/:debtorId/receive",
    ]);
});

test("registers suppliers routes", async () => {
    const { registerSuppliersRoutes } = await import("../../src/modules/suppliers/suppliers.routes.js");
    const { app, routes } = createAppRecorder();
    await registerSuppliersRoutes(app);
    expect(routes).toEqual([
        { method: "GET", url: "/suppliers" },
        { method: "POST", url: "/suppliers" },
        { method: "PATCH", url: "/suppliers/:id" },
        { method: "DELETE", url: "/suppliers/:id/permanent" },
        { method: "DELETE", url: "/suppliers/:id" },
        { method: "PATCH", url: "/suppliers/:id/restore" },
    ]);
});

test("registers users routes", async () => {
    const { registerUsersRoutes } = await import("../../src/modules/users/users.routes.js");
    const { app, routes } = createAppRecorder();
    await registerUsersRoutes(app);
    expect(routes).toEqual([
        { method: "GET", url: "/users" },
        { method: "POST", url: "/users" },
        { method: "PATCH", url: "/users/:id" },
        { method: "DELETE", url: "/users/:id" },
        { method: "PATCH", url: "/users/:id/restore" },
    ]);
});

test("registers expenses routes", async () => {
    const { registerExpensesRoutes } = await import("../../src/modules/expenses/expenses.routes.js");
    const { app, routes } = createAppRecorder();
    await registerExpensesRoutes(app);
    expect(routes).toEqual([
        { method: "GET", url: "/expenses" },
        { method: "POST", url: "/expenses" },
        { method: "PATCH", url: "/expenses/:id" },
        { method: "DELETE", url: "/expenses/:id" },
    ]);
});

test("registers cash movements routes", async () => {
    const { registerCashMovementsRoutes } = await import("../../src/modules/cash-movements/cash-movements.routes.js");
    const { app, routes } = createAppRecorder();
    await registerCashMovementsRoutes(app);
    expect(routes).toEqual([
        { method: "GET", url: "/cash-movements" },
        { method: "GET", url: "/cash-movements/balance" },
        { method: "POST", url: "/cash-movements" },
        { method: "DELETE", url: "/cash-movements/:id" },
    ]);
});

test("registers notifications routes", async () => {
    const { registerNotificationsRoutes } = await import("../../src/modules/notifications/notifications.routes.js");
    const { app, routes } = createAppRecorder();
    await registerNotificationsRoutes(app);
    expect(routes).toEqual([
        { method: "GET", url: "/notifications" },
        { method: "GET", url: "/notifications/unread-count" },
        { method: "PATCH", url: "/notifications/read-all" },
        { method: "PATCH", url: "/notifications/:id/read" },
        { method: "DELETE", url: "/notifications/:id" },
    ]);
});

test("registers catalog routes for every resource", async () => {
    const [{ registerCatalogRoutes }, { catalogResources }] = await Promise.all([
        import("../../src/modules/catalog/catalog.routes.js"),
        import("../../src/modules/catalog/catalog.schemas.js"),
    ]);
    const { app, routes } = createAppRecorder();
    await registerCatalogRoutes(app);
    const expected = catalogResources.flatMap((resource) => [
        { method: "GET", url: `/${resource.path}` },
        { method: "GET", url: `/${resource.path}/:id` },
        { method: "POST", url: `/${resource.path}` },
        { method: "PATCH", url: `/${resource.path}/:id` },
        { method: "DELETE", url: `/${resource.path}/:id/permanent` },
        { method: "DELETE", url: `/${resource.path}/:id` },
        { method: "PATCH", url: `/${resource.path}/:id/restore` },
    ]);
    expect(routes).toEqual(expected);
    expect(catalogResources.map((resource) => resource.path)).toEqual([
        "quantity-types",
        "products",
        "debtors",
        "expense-templates",
    ]);
});
