import { beforeEach, expect, mock, test } from "bun:test";
import type { FastifyReply, FastifyRequest } from "fastify";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const CUID = "cabcdefghijklmnop";

const invalidateMock = mock();
const invalidatePrefixMock = mock();
mock.module("../../src/lib/cache.js", () => ({
    invalidate: invalidateMock,
    invalidatePrefix: invalidatePrefixMock,
}));

const unaccentSearchIdsMock = mock();
mock.module("../../src/lib/search.js", () => ({ unaccentSearchIds: unaccentSearchIdsMock }));

const stockServiceMock = {
    addNoCostStock: mock(),
    createBatch: mock(),
    updateBatch: mock(),
    deleteBatch: mock(),
    getProductStock: mock(),
    adjustBatch: mock(),
    getBatch: mock(),
    searchBatchIds: mock(),
    listBatches: mock(),
    listAlerts: mock(),
    listMovements: mock(),
};
mock.module("../../src/modules/stock/stock.service.js", () => ({ stockService: stockServiceMock }));

const salesServiceMock = {
    create: mock(),
    update: mock(),
    delete: mock(),
    list: mock(),
    get: mock(),
    addPayment: mock(),
    cancel: mock(),
};
mock.module("../../src/modules/sales/sales.service.js", () => ({ salesService: salesServiceMock }));

const reportsServiceMock = {
    dashboard: mock(),
    debts: mock(),
    debtorStatement: mock(),
    receiveDebtorPayment: mock(),
};
mock.module("../../src/modules/reports/reports.service.js", () => ({ reportsService: reportsServiceMock }));

const cashMovementsServiceMock = { list: mock(), balance: mock(), create: mock(), delete: mock() };
mock.module("../../src/modules/cash-movements/cash-movements.service.js", () => ({
    cashMovementsService: cashMovementsServiceMock,
}));

const expensesServiceMock = { list: mock(), create: mock(), update: mock(), delete: mock() };
mock.module("../../src/modules/expenses/expenses.service.js", () => ({ expensesService: expensesServiceMock }));

const notificationsServiceMock = {
    list: mock(),
    unreadCount: mock(),
    markRead: mock(),
    markAllRead: mock(),
    delete: mock(),
};
mock.module("../../src/modules/notifications/notifications.service.js", () => ({
    notificationsService: notificationsServiceMock,
}));

const suppliersServiceMock = {
    list: mock(),
    create: mock(),
    update: mock(),
    archive: mock(),
    restore: mock(),
    permanentDelete: mock(),
};
mock.module("../../src/modules/suppliers/suppliers.service.js", () => ({ suppliersService: suppliersServiceMock }));

const usersServiceMock = { list: mock(), create: mock(), update: mock(), archive: mock(), restore: mock() };
mock.module("../../src/modules/users/users.service.js", () => ({ usersService: usersServiceMock }));

const catalogServiceMock = {
    list: mock(),
    get: mock(),
    create: mock(),
    update: mock(),
    archive: mock(),
    restore: mock(),
    permanentDelete: mock(),
    createUser: mock(),
};
mock.module("../../src/modules/catalog/catalog.service.js", () => ({ catalogService: catalogServiceMock }));

const authServiceMock = {
    setupStatus: mock(),
    setup: mock(),
    login: mock(),
    refresh: mock(),
    logout: mock(),
    me: mock(),
};
mock.module("../../src/modules/auth/auth.service.js", () => ({ authService: authServiceMock }));

const { stockController } = await import("../../src/modules/stock/stock.controller.js");
const { salesController } = await import("../../src/modules/sales/sales.controller.js");
const { reportsController } = await import("../../src/modules/reports/reports.controller.js");
const { cashMovementsController } = await import("../../src/modules/cash-movements/cash-movements.controller.js");
const { expensesController } = await import("../../src/modules/expenses/expenses.controller.js");
const { notificationsController } = await import("../../src/modules/notifications/notifications.controller.js");
const { suppliersController } = await import("../../src/modules/suppliers/suppliers.controller.js");
const { usersController: plainUsersController } = await import("../../src/modules/users/users.controller.js");
const { createCatalogController, usersController: catalogUsersController } = await import(
    "../../src/modules/catalog/catalog.controller.js"
);
const { catalogResources } = await import("../../src/modules/catalog/catalog.schemas.js");
const { createAuthController } = await import("../../src/modules/auth/auth.controller.js");

const productResource = catalogResources.find((resource) => resource.delegate === "product");
if (!productResource) throw new Error("product resource not found");
const quantityTypeResource = catalogResources.find((resource) => resource.delegate === "quantityType");
if (!quantityTypeResource) throw new Error("quantityType resource not found");
const productController = createCatalogController(productResource);
const quantityTypeController = createCatalogController(quantityTypeResource);

function fakeRequest(
    overrides: { body?: unknown; params?: unknown; query?: unknown; user?: { sub: string; role?: string } } = {},
) {
    return {
        body: overrides.body ?? {},
        params: overrides.params ?? {},
        query: overrides.query ?? {},
        user: overrides.user ?? { sub: "user1", role: "ADMIN" },
    } as unknown as FastifyRequest;
}

function fakeReply() {
    const send = mock((body: unknown) => body);
    const status = mock((_code: number) => ({ send }));
    return { status, send } as unknown as FastifyReply & { status: typeof status; send: typeof send };
}

beforeEach(() => {
    for (const group of [
        stockServiceMock,
        salesServiceMock,
        reportsServiceMock,
        cashMovementsServiceMock,
        expensesServiceMock,
        notificationsServiceMock,
        suppliersServiceMock,
        usersServiceMock,
        catalogServiceMock,
        authServiceMock,
    ]) {
        for (const fn of Object.values(group)) fn.mockReset();
    }
    invalidateMock.mockReset();
    invalidatePrefixMock.mockReset();
    unaccentSearchIdsMock.mockReset();
});

// ---- stock.controller ----

test("stock addNoCostStock delegates and invalidates related caches", async () => {
    stockServiceMock.addNoCostStock.mockResolvedValue({ id: "batch1", productId: "p1" });
    const request = fakeRequest({ body: { productId: CUID, quantityTypeId: CUID, quantity: 5 } });
    const reply = fakeReply();
    await stockController.addNoCostStock(request, reply);
    expect(stockServiceMock.addNoCostStock).toHaveBeenCalledWith(
        expect.objectContaining({ productId: CUID, quantityTypeId: CUID, quantity: 5 }),
        "user1",
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({ id: "batch1", productId: "p1" });
    expect(invalidateMock).toHaveBeenCalledWith("stock:product:p1", "dashboard");
});

test("stock createBatch rejects notifyLimit without quantityNotify", async () => {
    const request = fakeRequest({
        body: {
            supplierId: CUID,
            productId: CUID,
            quantityTypeId: CUID,
            quantityIn: 5,
            priceBuy: 10,
            dateBuy: new Date().toISOString(),
            notifyLimit: true,
        },
    });
    await expect(stockController.createBatch(request, fakeReply())).rejects.toThrow(
        "quantityNotify is required when notifyLimit is true",
    );
    expect(stockServiceMock.createBatch).not.toHaveBeenCalled();
});

test("stock createBatch creates the batch and invalidates caches", async () => {
    stockServiceMock.createBatch.mockResolvedValue({ id: "batch1", productId: "p1" });
    const request = fakeRequest({
        body: {
            supplierId: CUID,
            productId: CUID,
            quantityTypeId: CUID,
            quantityIn: 5,
            priceBuy: 10,
            dateBuy: new Date().toISOString(),
        },
    });
    const reply = fakeReply();
    await stockController.createBatch(request, reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidatePrefixMock).toHaveBeenCalledWith("stock:alerts:");
});

test("stock updateBatch rejects notifyLimit without quantityNotify", async () => {
    const request = fakeRequest({
        params: { id: CUID },
        body: {
            supplierId: CUID,
            productId: CUID,
            quantityTypeId: CUID,
            quantityIn: 5,
            priceBuy: 10,
            dateBuy: new Date().toISOString(),
            notifyLimit: true,
        },
    });
    await expect(stockController.updateBatch(request)).rejects.toThrow(
        "quantityNotify is required when notifyLimit is true",
    );
});

test("stock updateBatch updates and invalidates caches for both products", async () => {
    stockServiceMock.updateBatch.mockResolvedValue({
        batch: { id: "b1", productId: "new" },
        previousProductId: "old",
    });
    const request = fakeRequest({
        params: { id: CUID },
        body: {
            supplierId: CUID,
            productId: CUID,
            quantityTypeId: CUID,
            quantityIn: 5,
            priceBuy: 10,
            dateBuy: new Date().toISOString(),
        },
    });
    const result = await stockController.updateBatch(request);
    expect(result).toEqual({ id: "b1", productId: "new" });
    expect(invalidateMock).toHaveBeenCalledWith(
        `stock:batch:${CUID}`,
        "stock:product:old",
        "stock:product:new",
        "dashboard",
    );
});

test("stock deleteBatch deletes and invalidates caches", async () => {
    stockServiceMock.deleteBatch.mockResolvedValue({ id: "b1", productId: "p1" });
    const request = fakeRequest({ params: { id: CUID } });
    const reply = fakeReply();
    await stockController.deleteBatch(request, reply);
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(invalidateMock).toHaveBeenCalledWith(`stock:batch:b1`, "stock:product:p1", "dashboard");
});

test("stock getProductStock delegates to the service", async () => {
    stockServiceMock.getProductStock.mockResolvedValue({ product: { id: "p1" } });
    const result = await stockController.getProductStock(fakeRequest({ params: { productId: CUID } }));
    expect(result).toEqual({ product: { id: "p1" } });
    expect(stockServiceMock.getProductStock).toHaveBeenCalledWith(CUID);
});

test("stock adjust delegates and invalidates caches", async () => {
    stockServiceMock.adjustBatch.mockResolvedValue({ id: "b1", productId: "p1" });
    const request = fakeRequest({ body: { stockBatchId: CUID, quantity: -1, obs: "ajuste" } });
    await stockController.adjust(request);
    expect(stockServiceMock.adjustBatch).toHaveBeenCalledWith(CUID, -1, "ajuste", "user1");
    expect(invalidateMock).toHaveBeenCalledWith("stock:product:p1", "stock:batch:b1", "dashboard");
});

test("stock getBatch delegates to the service", async () => {
    stockServiceMock.getBatch.mockResolvedValue({ id: "b1" });
    expect(await stockController.getBatch(fakeRequest({ params: { id: CUID } }))).toEqual({ id: "b1" });
});

test("stock listBatches skips the service call when the search finds no matches", async () => {
    stockServiceMock.searchBatchIds.mockResolvedValue([]);
    const result = await stockController.listBatches(fakeRequest({ query: { search: "nada" } }));
    expect(result.data).toEqual([]);
    expect(stockServiceMock.listBatches).not.toHaveBeenCalled();
});

test("stock listBatches paginates using the resolved filters", async () => {
    stockServiceMock.listBatches.mockResolvedValue({ data: [{ id: "b1" }], total: 1 });
    const result = await stockController.listBatches(fakeRequest({ query: { status: "ACTIVE" } }));
    expect(result).toMatchObject({ data: [{ id: "b1" }], total: 1 });
});

test("stock listAlerts paginates", async () => {
    stockServiceMock.listAlerts.mockResolvedValue({ data: [], total: 0 });
    const result = await stockController.listAlerts(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("stock listMovements paginates", async () => {
    stockServiceMock.listMovements.mockResolvedValue({ data: [], total: 0 });
    const result = await stockController.listMovements(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

// ---- sales.controller ----

test("sales create requires a debtorId for debt sales", async () => {
    const request = fakeRequest({ body: { status: "DEBT", items: [{ productId: CUID, quantity: 1 }] } });
    await expect(salesController.create(request, fakeReply())).rejects.toThrow("debtorId is required for debt sales");
    expect(salesServiceMock.create).not.toHaveBeenCalled();
});

test("sales create requires a paymentMethod for paid sales", async () => {
    const request = fakeRequest({ body: { status: "PAID", items: [{ productId: CUID, quantity: 1 }] } });
    await expect(salesController.create(request, fakeReply())).rejects.toThrow(
        "paymentMethod is required for paid sales",
    );
});

test("sales create persists the sale and invalidates related caches", async () => {
    salesServiceMock.create.mockResolvedValue({ id: "s1", items: [{ productId: "p1" }] });
    const request = fakeRequest({ body: { status: "PENDING", items: [{ productId: CUID, quantity: 1 }] } });
    const reply = fakeReply();
    await salesController.create(request, reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidateMock).toHaveBeenCalledWith("dashboard", "stock:product:p1");
});

test("sales update validates debt/paid requirements and invalidates caches", async () => {
    salesServiceMock.update.mockResolvedValue({ id: "s1", items: [{ productId: "p1" }] });
    const request = fakeRequest({
        params: { id: CUID },
        body: { status: "PENDING", items: [{ productId: CUID, quantity: 1 }] },
    });
    const result = await salesController.update(request);
    expect(result).toEqual({ id: "s1", items: [{ productId: "p1" }] });
    expect(invalidatePrefixMock).toHaveBeenCalledWith("sales:list:");
});

test("sales delete removes the sale and invalidates caches", async () => {
    salesServiceMock.delete.mockResolvedValue({ id: "s1", items: [{ productId: "p1" }] });
    const reply = fakeReply();
    await salesController.delete(fakeRequest({ params: { id: CUID } }), reply);
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(invalidateMock).toHaveBeenCalledWith("dashboard", "stock:product:p1");
});

test("sales list skips the service call when the search finds no matches", async () => {
    unaccentSearchIdsMock.mockResolvedValue([]);
    const result = await salesController.list(fakeRequest({ query: { search: "nada" } }));
    expect(result.data).toEqual([]);
    expect(salesServiceMock.list).not.toHaveBeenCalled();
});

test("sales list paginates using the resolved filters", async () => {
    salesServiceMock.list.mockResolvedValue({ data: [{ id: "s1" }], total: 1 });
    const result = await salesController.list(fakeRequest());
    expect(result).toMatchObject({ data: [{ id: "s1" }], total: 1 });
});

test("sales get delegates to the service", async () => {
    salesServiceMock.get.mockResolvedValue({ id: "s1" });
    expect(await salesController.get(fakeRequest({ params: { id: CUID } }))).toEqual({ id: "s1" });
});

test("sales addPayment persists and invalidates caches", async () => {
    salesServiceMock.addPayment.mockResolvedValue({ id: "pay1" });
    const request = fakeRequest({ params: { id: CUID }, body: { amount: 10, method: "CASH" } });
    const reply = fakeReply();
    await salesController.addPayment(request, reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidateMock).toHaveBeenCalledWith(`sales:id:${CUID}`, "dashboard");
});

test("sales cancel invalidates caches for every affected product", async () => {
    salesServiceMock.cancel.mockResolvedValue({ id: "s1", items: [{ productId: "p1" }] });
    const result = await salesController.cancel(fakeRequest({ params: { id: CUID } }));
    expect(result).toEqual({ id: "s1", items: [{ productId: "p1" }] });
    expect(invalidateMock).toHaveBeenCalledWith("sales:id:s1", "dashboard", "stock:product:p1");
});

// ---- reports.controller ----

test("reports dashboard delegates to the service", async () => {
    reportsServiceMock.dashboard.mockResolvedValue({ revenue: 0 });
    expect(await reportsController.dashboard(fakeRequest())).toEqual({ revenue: 0 });
});

test("reports debts paginates the grouped result", async () => {
    reportsServiceMock.debts.mockResolvedValue({ data: [{ id: "d1" }], total: 1 });
    const result = await reportsController.debts(fakeRequest());
    expect(result).toMatchObject({ data: [{ id: "d1" }], total: 1 });
});

test("reports debtorStatement delegates to the service", async () => {
    reportsServiceMock.debtorStatement.mockResolvedValue({ debtor: { id: "d1" } });
    const result = await reportsController.debtorStatement(fakeRequest({ params: { debtorId: CUID } }));
    expect(result).toEqual({ debtor: { id: "d1" } });
});

test("reports receiveDebtorPayment persists and invalidates caches", async () => {
    reportsServiceMock.receiveDebtorPayment.mockResolvedValue([{ id: "pay1" }]);
    const request = fakeRequest({ params: { debtorId: CUID }, body: { amount: 10, method: "CASH" } });
    const reply = fakeReply();
    await reportsController.receiveDebtorPayment(request, reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidatePrefixMock).toHaveBeenCalledWith("reports:");
    expect(invalidateMock).toHaveBeenCalledWith("dashboard");
});

// ---- cash-movements.controller ----

test("cash movements list paginates", async () => {
    cashMovementsServiceMock.list.mockResolvedValue({ data: [], total: 0 });
    const result = await cashMovementsController.list(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("cash movements balance delegates to the service", async () => {
    cashMovementsServiceMock.balance.mockResolvedValue({ balance: 10 });
    expect(await cashMovementsController.balance()).toEqual({ balance: 10 });
});

test("cash movements create persists and invalidates caches", async () => {
    cashMovementsServiceMock.create.mockResolvedValue({ id: "cm1" });
    const reply = fakeReply();
    await cashMovementsController.create(fakeRequest({ body: { type: "DEPOSIT", value: 10 } }), reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidateMock).toHaveBeenCalledWith("dashboard");
    expect(invalidatePrefixMock).toHaveBeenCalledWith("cash-movements:");
});

test("cash movements delete removes and invalidates caches", async () => {
    const reply = fakeReply();
    await cashMovementsController.delete(fakeRequest({ params: { id: CUID } }), reply);
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(cashMovementsServiceMock.delete).toHaveBeenCalledWith(CUID);
    expect(invalidateMock).toHaveBeenCalledWith("dashboard");
});

// ---- expenses.controller ----

test("expenses list paginates", async () => {
    expensesServiceMock.list.mockResolvedValue({ data: [], total: 0 });
    const result = await expensesController.list(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("expenses create persists and invalidates caches", async () => {
    expensesServiceMock.create.mockResolvedValue({ id: "e1" });
    const reply = fakeReply();
    await expensesController.create(
        fakeRequest({ body: { name: "Aluguel", value: 100, dueDate: new Date().toISOString() } }),
        reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(invalidateMock).toHaveBeenCalledWith("dashboard");
    expect(invalidatePrefixMock).toHaveBeenCalledWith("reports:");
});

test("expenses update persists and invalidates caches", async () => {
    expensesServiceMock.update.mockResolvedValue({ id: "e1" });
    const result = await expensesController.update(fakeRequest({ params: { id: CUID }, body: { name: "Novo" } }));
    expect(result).toEqual({ id: "e1" });
    expect(invalidateMock).toHaveBeenCalledWith("dashboard");
});

test("expenses delete removes and invalidates caches", async () => {
    const reply = fakeReply();
    await expensesController.delete(fakeRequest({ params: { id: CUID } }), reply);
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(expensesServiceMock.delete).toHaveBeenCalledWith(CUID);
});

// ---- notifications.controller ----

test("notifications list paginates", async () => {
    notificationsServiceMock.list.mockResolvedValue({ data: [], total: 0 });
    const result = await notificationsController.list(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("notifications unreadCount delegates to the service", async () => {
    notificationsServiceMock.unreadCount.mockResolvedValue(3);
    expect(await notificationsController.unreadCount(fakeRequest())).toEqual({ count: 3 });
});

test("notifications markRead delegates to the service", async () => {
    const reply = fakeReply();
    await notificationsController.markRead(fakeRequest({ params: { id: CUID } }), reply);
    expect(notificationsServiceMock.markRead).toHaveBeenCalledWith(CUID, "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("notifications markAllRead delegates to the service", async () => {
    const reply = fakeReply();
    await notificationsController.markAllRead(fakeRequest(), reply);
    expect(notificationsServiceMock.markAllRead).toHaveBeenCalledWith("user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("notifications delete delegates to the service", async () => {
    const reply = fakeReply();
    await notificationsController.delete(fakeRequest({ params: { id: CUID } }), reply);
    expect(notificationsServiceMock.delete).toHaveBeenCalledWith(CUID);
    expect(reply.status).toHaveBeenCalledWith(204);
});

// ---- suppliers.controller ----

test("suppliers list paginates", async () => {
    suppliersServiceMock.list.mockResolvedValue({ data: [], total: 0 });
    const result = await suppliersController.list(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("suppliers create delegates to the service", async () => {
    suppliersServiceMock.create.mockResolvedValue({ id: "s1" });
    const reply = fakeReply();
    await suppliersController.create(fakeRequest({ body: { name: "Fornecedor" } }), reply);
    expect(reply.status).toHaveBeenCalledWith(201);
});

test("suppliers update delegates to the service", async () => {
    suppliersServiceMock.update.mockResolvedValue({ id: "s1" });
    const result = await suppliersController.update(fakeRequest({ params: { id: CUID }, body: { name: "Novo" } }));
    expect(result).toEqual({ id: "s1" });
});

test("suppliers archive delegates to the service", async () => {
    const reply = fakeReply();
    await suppliersController.archive(fakeRequest({ params: { id: CUID } }), reply);
    expect(suppliersServiceMock.archive).toHaveBeenCalledWith(CUID);
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("suppliers restore delegates to the service", async () => {
    const reply = fakeReply();
    await suppliersController.restore(fakeRequest({ params: { id: CUID } }), reply);
    expect(suppliersServiceMock.restore).toHaveBeenCalledWith(CUID);
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("suppliers permanentDelete delegates to the service", async () => {
    const reply = fakeReply();
    await suppliersController.permanentDelete(fakeRequest({ params: { id: CUID } }), reply);
    expect(suppliersServiceMock.permanentDelete).toHaveBeenCalledWith(CUID);
    expect(reply.status).toHaveBeenCalledWith(204);
});

// ---- users.controller ----

test("users list paginates", async () => {
    usersServiceMock.list.mockResolvedValue({ data: [], total: 0 });
    const result = await plainUsersController.list(fakeRequest());
    expect(result).toMatchObject({ data: [], total: 0 });
});

test("users create delegates to the service", async () => {
    usersServiceMock.create.mockResolvedValue({ id: "u1" });
    const reply = fakeReply();
    await plainUsersController.create(
        fakeRequest({ body: { name: "Ana", username: "ana", password: "supersecurepassword" } }),
        reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
});

test("users update delegates to the service", async () => {
    usersServiceMock.update.mockResolvedValue({ id: "u1" });
    const result = await plainUsersController.update(fakeRequest({ params: { id: CUID }, body: { name: "Novo" } }));
    expect(result).toEqual({ id: "u1" });
});

test("users archive delegates to the service", async () => {
    const reply = fakeReply();
    await plainUsersController.archive(fakeRequest({ params: { id: CUID } }), reply);
    expect(usersServiceMock.archive).toHaveBeenCalledWith(CUID, "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("users restore delegates to the service", async () => {
    const reply = fakeReply();
    await plainUsersController.restore(fakeRequest({ params: { id: CUID } }), reply);
    expect(usersServiceMock.restore).toHaveBeenCalledWith(CUID);
    expect(reply.status).toHaveBeenCalledWith(204);
});

// ---- catalog.controller ----

test("catalog list builds the where clause from status/includeArchived/type filters", async () => {
    catalogServiceMock.list.mockResolvedValue([[{ id: "p1" }], 1]);
    await productController.list(fakeRequest({ query: { type: "FINISHED", stockOrder: "asc" } }));
    expect(catalogServiceMock.list).toHaveBeenCalledWith(
        productResource,
        { status: { not: "ARCHIVED" }, type: "FINISHED" },
        0,
        20,
        "asc",
        undefined,
    );
});

test("catalog list ignores product-only filters for other resources", async () => {
    catalogServiceMock.list.mockResolvedValue([[], 0]);
    await quantityTypeController.list(fakeRequest({ query: { includeArchived: true } }));
    expect(catalogServiceMock.list).toHaveBeenCalledWith(quantityTypeResource, {}, 0, 20, undefined, undefined);
});

test("catalog get delegates to the service", async () => {
    catalogServiceMock.get.mockResolvedValue({ id: "p1" });
    expect(await productController.get(fakeRequest({ params: { id: CUID } }))).toEqual({ id: "p1" });
});

test("catalog create validates the resource schema and persists", async () => {
    catalogServiceMock.create.mockResolvedValue({ id: "p1" });
    const reply = fakeReply();
    await productController.create(fakeRequest({ body: { name: "Bolo", priceSell: 10 } }), reply);
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(catalogServiceMock.create).toHaveBeenCalledWith(
        productResource,
        expect.objectContaining({ name: "Bolo", priceSell: 10 }),
        "user1",
    );
});

test("catalog update validates a partial schema and persists", async () => {
    catalogServiceMock.update.mockResolvedValue({ id: "p1" });
    const result = await productController.update(fakeRequest({ params: { id: CUID }, body: { name: "Bolo novo" } }));
    expect(result).toEqual({ id: "p1" });
});

test("catalog archive delegates to the service", async () => {
    const reply = fakeReply();
    await productController.archive(fakeRequest({ params: { id: CUID } }), reply);
    expect(catalogServiceMock.archive).toHaveBeenCalledWith(productResource, CUID, "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("catalog restore delegates to the service", async () => {
    const reply = fakeReply();
    await productController.restore(fakeRequest({ params: { id: CUID } }), reply);
    expect(catalogServiceMock.restore).toHaveBeenCalledWith(productResource, CUID, "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("catalog permanentDelete delegates to the service", async () => {
    const reply = fakeReply();
    await productController.permanentDelete(fakeRequest({ params: { id: CUID } }), reply);
    expect(catalogServiceMock.permanentDelete).toHaveBeenCalledWith(productResource, CUID, "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("catalog usersController.create delegates to the service", async () => {
    catalogServiceMock.createUser.mockResolvedValue({ id: "u1" });
    const reply = fakeReply();
    await catalogUsersController.create(
        fakeRequest({ body: { name: "Ana", username: "ana", password: "supersecurepassword" } }),
        reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
});

test("catalog usersController.unsupported always throws 501", () => {
    expect(() => catalogUsersController.unsupported()).toThrow("Not implemented");
});

// ---- auth.controller ----

test("auth login delegates to the service", async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    const app = { jwt: { sign: mock() } } as never;
    const controller = createAuthController(app);
    const result = await controller.login(fakeRequest({ body: { username: "ana", password: "secret" } }));
    expect(result).toEqual({ accessToken: "a", refreshToken: "b" });
    expect(authServiceMock.login).toHaveBeenCalledWith(app, "ana", "secret");
});

test("auth setupStatus delegates to the service", async () => {
    authServiceMock.setupStatus.mockResolvedValue({ needsSetup: true });
    const controller = createAuthController({} as never);
    expect(await controller.setupStatus()).toEqual({ needsSetup: true });
});

test("auth setup persists and replies 201", async () => {
    authServiceMock.setup.mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    const controller = createAuthController({} as never);
    const reply = fakeReply();
    await controller.setup(
        fakeRequest({ body: { name: "Ana", username: "ana123", password: "supersecurepassword" } }),
        reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "b" });
});

test("auth refresh delegates to the service", async () => {
    authServiceMock.refresh.mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    const app = {} as never;
    const controller = createAuthController(app);
    const result = await controller.refresh(fakeRequest({ body: { refreshToken: "session1.secretsecretsecret" } }));
    expect(result).toEqual({ accessToken: "a", refreshToken: "b" });
    expect(authServiceMock.refresh).toHaveBeenCalledWith(app, "session1.secretsecretsecret");
});

test("auth logout revokes the session and replies 204", async () => {
    const controller = createAuthController({} as never);
    const reply = fakeReply();
    await controller.logout(fakeRequest({ body: { refreshToken: "session1.secretsecretsecret" } }), reply);
    expect(authServiceMock.logout).toHaveBeenCalledWith("session1.secretsecretsecret", "user1");
    expect(reply.status).toHaveBeenCalledWith(204);
});

test("auth me delegates to the service", async () => {
    authServiceMock.me.mockResolvedValue({ id: "u1" });
    const controller = createAuthController({} as never);
    expect(await controller.me(fakeRequest())).toEqual({ id: "u1" });
    expect(authServiceMock.me).toHaveBeenCalledWith("user1");
});
