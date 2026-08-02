import { beforeEach, expect, mock, test } from "bun:test";
import { Prisma } from "@prisma/client";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const prismaMock = {
    sale: { aggregate: mock(), findMany: mock(), count: mock() },
    expense: { aggregate: mock(), findMany: mock(), findUnique: mock(), create: mock(), update: mock() },
    payment: { findMany: mock() },
    stockBatch: {
        count: mock(),
        create: mock(),
        findUnique: mock(),
        findMany: mock(),
        aggregate: mock(),
        update: mock(),
        delete: mock(),
    },
    stockMovement: { create: mock(), findMany: mock(), count: mock(), deleteMany: mock() },
    product: { findUnique: mock(), findFirst: mock(), create: mock(), update: mock() },
    user: { findUnique: mock() },
    userSession: { create: mock(), findUnique: mock(), update: mock(), updateMany: mock() },
    notification: {
        findMany: mock(),
        count: mock(),
        findUnique: mock(),
        create: mock(),
        delete: mock(),
        deleteMany: mock(),
    },
    notificationRead: { upsert: mock(), createMany: mock() },
    expenseTemplate: { findMany: mock(), updateMany: mock(), findUnique: mock(), create: mock(), update: mock() },
    audit: { create: mock() },
    $queryRaw: mock(),
    $transaction: mock(async (callback: (client: typeof prismaMock) => unknown) => callback(prismaMock)),
};

mock.module("../../src/lib/prisma.js", () => ({ prisma: prismaMock }));

const { reportsService } = await import("../../src/modules/reports/reports.service.js");
const { stockService } = await import("../../src/modules/stock/stock.service.js");
const { notificationsService } = await import("../../src/modules/notifications/notifications.service.js");
const { expensesService } = await import("../../src/modules/expenses/expenses.service.js");
const { catalogService } = await import("../../src/modules/catalog/catalog.service.js");
const { catalogResources } = await import("../../src/modules/catalog/catalog.schemas.js");
const { runExpenseRecurrenceJob } = await import("../../src/jobs/expense-recurrence.job.js");
const { salesService } = await import("../../src/modules/sales/sales.service.js");

const expenseTemplateResource = catalogResources.find((resource) => resource.delegate === "expenseTemplate");
if (!expenseTemplateResource) throw new Error("expenseTemplate resource not found");
const productResource = catalogResources.find((resource) => resource.delegate === "product");
if (!productResource) throw new Error("product resource not found");

beforeEach(() => {
    for (const delegate of Object.values(prismaMock)) {
        if (typeof delegate === "object" && delegate !== null) {
            for (const value of Object.values(delegate)) {
                if (typeof value === "function" && "mockReset" in value) value.mockReset();
            }
        }
    }
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof prismaMock) => unknown) =>
        callback(prismaMock),
    );
});

test("builds dashboard totals", async () => {
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(100) } });
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(20) } });
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { value: new Prisma.Decimal(35) } });
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);
    prismaMock.stockBatch.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ total: new Prisma.Decimal(40) }]);
    prismaMock.stockBatch.count.mockResolvedValue(2);

    const result = await reportsService.dashboard();
    expect(result.revenue.toString()).toBe("100");
    expect(result.receivables.toString()).toBe("20");
    expect(result.expenses.toString()).toBe("35");
    expect(result.profit.toString()).toBe("65");
    expect(result.lowStock).toBe(2);
    expect(result.stockReplenishment.toString()).toBe("40");
    expect(result.cashFlow).toHaveLength(10);
});

test("rejects stock adjustments below zero", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "batch",
        productId: "product",
        status: "ACTIVE",
        quantityLeft: new Prisma.Decimal(2),
        priceBuy: new Prisma.Decimal(10),
    });
    await expect(stockService.adjustBatch("batch", -3, "count", "user")).rejects.toThrow("Insufficient stock");
    expect(prismaMock.stockBatch.update).not.toHaveBeenCalled();
});

test("creates a stock batch and inbound movement in one transaction", async () => {
    prismaMock.stockBatch.create.mockResolvedValue({ id: "batch", productId: "product" });
    prismaMock.stockMovement.create.mockResolvedValue({ id: "movement" });
    const result = await stockService.createBatch(
        {
            supplierId: "supplier",
            productId: "product",
            quantityTypeId: "unit",
            quantityIn: 3,
            priceBuy: 10,
            dateBuy: new Date(),
            notifyLimit: false,
        },
        "user",
    );
    expect(result).toEqual({ id: "batch", productId: "product" });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(1);
});

test("product create requires priceSell unless the product is a raw material", async () => {
    prismaMock.product.create.mockResolvedValue({ id: "p1" });
    await expect(
        catalogService.create(productResource, { name: "Creme de leite", type: "RAW_MATERIAL" }, "user"),
    ).resolves.toBeDefined();
    expect(prismaMock.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ priceSell: null, createdUserId: "user" }),
    });

    await expect(catalogService.create(productResource, { name: "Trufa", type: "FINISHED" }, "user")).rejects.toThrow(
        "priceSell is required unless the product is a raw material",
    );
});

test("product update keeps the previous priceSell when it is not sent again", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", type: "BOTH", priceSell: new Prisma.Decimal(12.5) });
    prismaMock.product.update.mockResolvedValue({ id: "p1" });
    await catalogService.update(productResource, "p1", { name: "Trufa nova" }, "user");
    const payload = prismaMock.product.update.mock.calls[0][0].data;
    expect(payload.priceSell).toBe(12.5);
});

test("product update forces priceSell to null when switching to raw material", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", type: "BOTH", priceSell: new Prisma.Decimal(12.5) });
    prismaMock.product.update.mockResolvedValue({ id: "p1" });
    await catalogService.update(productResource, "p1", { type: "RAW_MATERIAL" }, "user");
    const payload = prismaMock.product.update.mock.calls[0][0].data;
    expect(payload.priceSell).toBeNull();
});

test("sales cannot sell a product marked as raw material", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
        id: "cream",
        status: "ACTIVE",
        type: "RAW_MATERIAL",
        name: "Creme",
    });

    await expect(
        salesService.create({ status: "PENDING", items: [{ productId: "cream", quantity: 1 }] }, "user"),
    ).rejects.toThrow("Creme is a raw material and cannot be sold directly");
});

test("notifications list flags entries already read by the requesting user", async () => {
    prismaMock.notification.findMany.mockResolvedValue([
        { id: "n1", title: "A", reads: [{ userId: "user" }] },
        { id: "n2", title: "B", reads: [] },
    ]);
    prismaMock.notification.count.mockResolvedValue(2);
    const result = await notificationsService.list("user", 0, 20);
    expect(result.data).toEqual([
        { id: "n1", title: "A", read: true },
        { id: "n2", title: "B", read: false },
    ]);
    expect(result.total).toBe(2);
});

test("notifications unreadCount counts entries without a read record for the user", async () => {
    prismaMock.notification.count.mockResolvedValue(3);
    expect(await notificationsService.unreadCount("user")).toBe(3);
    expect(prismaMock.notification.count).toHaveBeenCalledWith({ where: { reads: { none: { userId: "user" } } } });
});

test("markRead throws when notification does not exist", async () => {
    prismaMock.notification.findUnique.mockResolvedValue(null);
    await expect(notificationsService.markRead("missing", "user")).rejects.toThrow("Notification not found");
    expect(prismaMock.notificationRead.upsert).not.toHaveBeenCalled();
});

test("markRead upserts the read record when the notification exists", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({ id: "n1" });
    await notificationsService.markRead("n1", "user");
    expect(prismaMock.notificationRead.upsert).toHaveBeenCalledWith({
        where: { notificationId_userId: { notificationId: "n1", userId: "user" } },
        create: { notificationId: "n1", userId: "user" },
        update: {},
    });
});

test("markAllRead skips createMany when there is nothing unread", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    await notificationsService.markAllRead("user");
    expect(prismaMock.notificationRead.createMany).not.toHaveBeenCalled();
});

test("markAllRead bulk-creates read records for every unread notification", async () => {
    prismaMock.notification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    await notificationsService.markAllRead("user");
    expect(prismaMock.notificationRead.createMany).toHaveBeenCalledWith({
        data: [
            { notificationId: "n1", userId: "user" },
            { notificationId: "n2", userId: "user" },
        ],
        skipDuplicates: true,
    });
});

test("expense template create nulls out schedule for ONE_TIME recurrence", async () => {
    prismaMock.expenseTemplate.create.mockResolvedValue({ id: "et1" });
    await catalogService.create(
        expenseTemplateResource,
        { name: "Aluguel", recurrence: "ONE_TIME", defaultValue: 100 },
        "user",
    );
    expect(prismaMock.expenseTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ anchorDate: null, nextDueDate: null, createdUserId: "user" }),
    });
});

test("expense template create requires anchorDate for recurring templates", async () => {
    await expect(
        catalogService.create(
            expenseTemplateResource,
            { name: "Aluguel", recurrence: "MONTHLY", defaultValue: 100 },
            "user",
        ),
    ).rejects.toThrow("anchorDate is required for recurring expense templates");
    expect(prismaMock.expenseTemplate.create).not.toHaveBeenCalled();
});

test("expense template create computes nextDueDate for an active recurring template", async () => {
    prismaMock.expenseTemplate.create.mockResolvedValue({ id: "et1" });
    const anchorDate = new Date("2026-01-31T00:00:00Z");
    await catalogService.create(
        expenseTemplateResource,
        { name: "Aluguel", recurrence: "MONTHLY", defaultValue: 100, anchorDate },
        "user",
    );
    const payload = prismaMock.expenseTemplate.create.mock.calls[0][0].data;
    expect(payload.anchorDate).toEqual(anchorDate);
    expect(payload.nextDueDate).toBeInstanceOf(Date);
    expect(payload.nextDueDate.getTime()).toBeGreaterThanOrEqual(Date.now());
});

test("expense template update recalculates nextDueDate from the previous anchor when not provided", async () => {
    const anchorDate = new Date("2026-01-31T00:00:00Z");
    prismaMock.expenseTemplate.findUnique.mockResolvedValue({
        id: "et1",
        recurrence: "MONTHLY",
        anchorDate,
        status: "ACTIVE",
    });
    prismaMock.expenseTemplate.update.mockResolvedValue({ id: "et1" });
    await catalogService.update(expenseTemplateResource, "et1", { name: "Aluguel novo" }, "user");
    const payload = prismaMock.expenseTemplate.update.mock.calls[0][0].data;
    expect(payload.anchorDate).toEqual(anchorDate);
    expect(payload.nextDueDate).toBeInstanceOf(Date);
});

test("expense template restore recalculates nextDueDate from today instead of the last due date", async () => {
    const anchorDate = new Date("2020-01-31T00:00:00Z");
    prismaMock.expenseTemplate.findUnique.mockResolvedValue({
        id: "et1",
        recurrence: "MONTHLY",
        anchorDate,
        status: "ARCHIVED",
    });
    prismaMock.expenseTemplate.update.mockResolvedValue({ id: "et1" });
    await catalogService.restore(expenseTemplateResource, "et1", "user");
    const payload = prismaMock.expenseTemplate.update.mock.calls[0][0].data;
    expect(payload.status).toBe("ACTIVE");
    expect(payload.nextDueDate.getTime()).toBeGreaterThanOrEqual(Date.now());
});

test("expense update clears pending notifications once it leaves PENDING", async () => {
    prismaMock.expense.findUnique.mockResolvedValue({ id: "e1", status: "PENDING" });
    prismaMock.expense.update.mockResolvedValue({ id: "e1", status: "PAID" });
    await expensesService.update("e1", { status: "PAID", paidAt: new Date() });
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { entityType: "expense", entityId: "e1" },
    });
});

test("expense update does not touch notifications when it stays PENDING", async () => {
    prismaMock.expense.findUnique.mockResolvedValue({ id: "e1", status: "PENDING" });
    prismaMock.expense.update.mockResolvedValue({ id: "e1", status: "PENDING" });
    await expensesService.update("e1", { name: "Novo nome" });
    expect(prismaMock.notification.deleteMany).not.toHaveBeenCalled();
});

test("expense recurrence job does nothing when no template is due", async () => {
    prismaMock.expenseTemplate.findMany.mockResolvedValue([]);
    await runExpenseRecurrenceJob();
    expect(prismaMock.expenseTemplate.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
});

test("expense recurrence job creates the expense and notification when the claim succeeds", async () => {
    const nextDueDate = new Date("2026-01-01T00:00:00Z");
    prismaMock.expenseTemplate.findMany.mockResolvedValue([
        {
            id: "et1",
            name: "Aluguel",
            anchorDate: new Date("2025-01-01T00:00:00Z"),
            recurrence: "MONTHLY",
            nextDueDate,
            defaultValue: new Prisma.Decimal(150),
            createdUserId: "user",
        },
    ]);
    prismaMock.expenseTemplate.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.expense.create.mockResolvedValue({ id: "e1" });
    await runExpenseRecurrenceJob();
    expect(prismaMock.expense.create).toHaveBeenCalledWith({
        data: {
            expenseTemplateId: "et1",
            name: "Aluguel",
            value: new Prisma.Decimal(150),
            dueDate: nextDueDate,
            status: "PENDING",
            createdUserId: "user",
        },
    });
    const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(150);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
            type: "EXPENSE_DUE",
            title: "Despesa vencendo hoje",
            message: `Aluguel (${currency}) vence hoje.`,
            entityType: "expense",
            entityId: "e1",
        },
    });
});

test("expense recurrence job skips the template when another process already claimed it", async () => {
    prismaMock.expenseTemplate.findMany.mockResolvedValue([
        {
            id: "et1",
            name: "Aluguel",
            anchorDate: new Date("2025-01-01T00:00:00Z"),
            recurrence: "MONTHLY",
            nextDueDate: new Date("2026-01-01T00:00:00Z"),
            defaultValue: new Prisma.Decimal(150),
            createdUserId: "user",
        },
    ]);
    prismaMock.expenseTemplate.updateMany.mockResolvedValue({ count: 0 });
    await runExpenseRecurrenceJob();
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
});
