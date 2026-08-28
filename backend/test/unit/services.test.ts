import { beforeEach, expect, mock, test } from "bun:test";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const prismaMock = {
    sale: {
        aggregate: mock(),
        findMany: mock(),
        count: mock(),
        findUnique: mock(),
        findUniqueOrThrow: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
    },
    saleItem: { create: mock(), deleteMany: mock(), count: mock() },
    expense: {
        aggregate: mock(),
        findMany: mock(),
        findUnique: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
        count: mock(),
    },
    payment: { findMany: mock(), create: mock(), deleteMany: mock() },
    stockBatch: {
        count: mock(),
        create: mock(),
        findUnique: mock(),
        findMany: mock(),
        aggregate: mock(),
        update: mock(),
        delete: mock(),
        groupBy: mock(),
    },
    stockMovement: { create: mock(), findMany: mock(), count: mock(), deleteMany: mock(), updateMany: mock() },
    product: {
        findUnique: mock(),
        findFirst: mock(),
        findMany: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
        count: mock(),
    },
    user: { findUnique: mock(), findMany: mock(), count: mock(), create: mock(), update: mock() },
    userSession: { create: mock(), findUnique: mock(), update: mock(), updateMany: mock() },
    notification: {
        findMany: mock(),
        count: mock(),
        findUnique: mock(),
        findFirst: mock(),
        create: mock(),
        delete: mock(),
        deleteMany: mock(),
    },
    notificationRead: { upsert: mock(), createMany: mock() },
    expenseTemplate: {
        findMany: mock(),
        updateMany: mock(),
        findUnique: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
        count: mock(),
    },
    cashMovement: {
        findMany: mock(),
        count: mock(),
        aggregate: mock(),
        create: mock(),
        update: mock(),
        findUnique: mock(),
        delete: mock(),
    },
    supplier: {
        findMany: mock(),
        count: mock(),
        create: mock(),
        update: mock(),
        findUnique: mock(),
        delete: mock(),
    },
    debtor: {
        findMany: mock(),
        count: mock(),
        findFirst: mock(),
        findUnique: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
    },
    quantityType: {
        findMany: mock(),
        count: mock(),
        findFirst: mock(),
        findUnique: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
    },
    audit: { create: mock() },
    $queryRaw: mock(),
    $transaction: mock(async (callback: (client: typeof prismaMock) => unknown) => callback(prismaMock)),
};

mock.module("../../src/lib/prisma.js", () => ({ prisma: prismaMock }));

const { reportsService } = await import("../../src/modules/reports/reports.service.js");
const { stockService } = await import("../../src/modules/stock/stock.service.js");
const { notificationsService } = await import("../../src/modules/notifications/notifications.service.js");
const { expensesService } = await import("../../src/modules/expenses/expenses.service.js");
const { cashMovementsService } = await import("../../src/modules/cash-movements/cash-movements.service.js");
const { catalogService } = await import("../../src/modules/catalog/catalog.service.js");
const { catalogResources } = await import("../../src/modules/catalog/catalog.schemas.js");
const { runExpenseRecurrenceJob, runExpenseUpcomingNotificationJob } = await import(
    "../../src/jobs/expense-recurrence.job.js"
);
const { addDays, utcMidnight } = await import("../../src/lib/recurrence.js");
const { salesService } = await import("../../src/modules/sales/sales.service.js");
const { authService } = await import("../../src/modules/auth/auth.service.js");
const { usersService } = await import("../../src/modules/users/users.service.js");
const { suppliersService } = await import("../../src/modules/suppliers/suppliers.service.js");
const { localCache } = await import("../../src/lib/cache.js");

const quantityTypeResource = catalogResources.find((resource) => resource.delegate === "quantityType");
if (!quantityTypeResource) throw new Error("quantityType resource not found");
const debtorResource = catalogResources.find((resource) => resource.delegate === "debtor");
if (!debtorResource) throw new Error("debtor resource not found");

function fakeApp() {
    return { jwt: { sign: mock(() => "signed-token") } } as unknown as Parameters<typeof authService.login>[0];
}

function prismaKnownError(code: string, target?: string | string[]) {
    return new Prisma.PrismaClientKnownRequestError("db error", {
        code,
        clientVersion: "test",
        meta: target === undefined ? undefined : { target },
    });
}

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
    localCache.flushAll();
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
    prismaMock.cashMovement.findMany.mockResolvedValue([]);

    const result = await reportsService.dashboard();
    expect(result.revenue.toString()).toBe("100");
    expect(result.receivables.toString()).toBe("20");
    expect(result.expenses.toString()).toBe("35");
    expect(result.profit.toString()).toBe("65");
    expect(result.lowStock).toBe(2);
    expect(result.stockReplenishment.toString()).toBe("40");
    expect(result.cashFlow).toHaveLength(10);
});

test("dashboard cash flow buckets payments, paid expenses and stock purchases by day", async () => {
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(0) } });
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(0) } });
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { value: new Prisma.Decimal(0) } });
    const today = new Date();
    prismaMock.payment.findMany.mockResolvedValue([{ amount: new Prisma.Decimal(15), paidAt: today }]);
    prismaMock.expense.findMany.mockResolvedValue([{ value: new Prisma.Decimal(25), paidAt: today }]);
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { dateBuy: today, priceBuy: new Prisma.Decimal(2), quantityIn: new Prisma.Decimal(3) },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ total: new Prisma.Decimal(0) }]);
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.cashMovement.findMany.mockResolvedValue([]);

    const result = await reportsService.dashboard({ startDate: today, endDate: today });
    expect(result.cashFlow[0].income.toString()).toBe("15");
    expect(result.cashFlow[0].expense.toString()).toBe("31");
});

test("includes manual cash movements in the cash flow", async () => {
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(0) } });
    prismaMock.sale.aggregate.mockResolvedValueOnce({ _sum: { total: new Prisma.Decimal(0) } });
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { value: new Prisma.Decimal(0) } });
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);
    prismaMock.stockBatch.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ total: new Prisma.Decimal(0) }]);
    prismaMock.stockBatch.count.mockResolvedValue(0);
    const today = new Date();
    prismaMock.cashMovement.findMany.mockResolvedValue([
        { type: "DEPOSIT", value: new Prisma.Decimal(50), createdAt: today },
        { type: "WITHDRAWAL", value: new Prisma.Decimal(15), createdAt: today },
    ]);

    const result = await reportsService.dashboard({ startDate: today, endDate: today });
    expect(result.cashFlow).toHaveLength(1);
    expect(result.cashFlow[0].income.toString()).toBe("50");
    expect(result.cashFlow[0].expense.toString()).toBe("15");
    expect(prismaMock.cashMovement.findMany.mock.calls[0][0].where).toMatchObject({ stockBatchId: null });
});

test("cash movements balance nets deposits against withdrawals", async () => {
    prismaMock.cashMovement.aggregate.mockResolvedValueOnce({ _sum: { value: new Prisma.Decimal(200) } });
    prismaMock.cashMovement.aggregate.mockResolvedValueOnce({ _sum: { value: new Prisma.Decimal(80) } });

    const result = await cashMovementsService.balance();
    expect(result.balance.toString()).toBe("120");
});

test("cash movement delete throws when not found", async () => {
    prismaMock.cashMovement.findUnique.mockResolvedValue(null);
    await expect(cashMovementsService.delete("missing")).rejects.toThrow("Cash movement not found");
    expect(prismaMock.cashMovement.delete).not.toHaveBeenCalled();
});

test("cash movement delete rejects a movement linked to a stock batch", async () => {
    prismaMock.cashMovement.findUnique.mockResolvedValue({ id: "cm1", stockBatchId: "b1" });
    await expect(cashMovementsService.delete("cm1")).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.cashMovement.delete).not.toHaveBeenCalled();
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
    const cashMovementData = prismaMock.cashMovement.create.mock.calls[0][0].data;
    expect(cashMovementData.value.toString()).toBe("30");
    expect(cashMovementData).toMatchObject({
        type: "WITHDRAWAL",
        obs: "Reposição de estoque (lote batch)",
        stockBatchId: "batch",
        createdUserId: "user",
    });
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

test("expense upcoming notification job does nothing when no template is due for a heads-up", async () => {
    prismaMock.expenseTemplate.findMany.mockResolvedValue([]);
    await runExpenseUpcomingNotificationJob();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
});

test("expense upcoming notification job creates a notification once inside the notify window", async () => {
    const today = utcMidnight(new Date());
    const nextDueDate = addDays(today, 3);
    prismaMock.expenseTemplate.findMany.mockResolvedValue([
        {
            id: "et1",
            name: "Aluguel",
            recurrence: "MONTHLY",
            nextDueDate,
            notifyDaysBefore: 5,
            defaultValue: new Prisma.Decimal(150),
        },
    ]);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    await runExpenseUpcomingNotificationJob();
    const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(150);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
            type: "EXPENSE_UPCOMING",
            title: "Despesa próxima do vencimento",
            message: `Aluguel (${currency}) vence em 3 dias.`,
            entityType: "expense-template",
            entityId: `et1:${nextDueDate.toISOString().slice(0, 10)}`,
        },
    });
});

test("expense upcoming notification job stays quiet before entering the notify window", async () => {
    const today = utcMidnight(new Date());
    prismaMock.expenseTemplate.findMany.mockResolvedValue([
        {
            id: "et1",
            name: "Aluguel",
            recurrence: "MONTHLY",
            nextDueDate: addDays(today, 10),
            notifyDaysBefore: 5,
            defaultValue: new Prisma.Decimal(150),
        },
    ]);
    await runExpenseUpcomingNotificationJob();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
});

test("expense upcoming notification job does not duplicate an already-sent notification", async () => {
    const today = utcMidnight(new Date());
    prismaMock.expenseTemplate.findMany.mockResolvedValue([
        {
            id: "et1",
            name: "Aluguel",
            recurrence: "MONTHLY",
            nextDueDate: addDays(today, 2),
            notifyDaysBefore: 5,
            defaultValue: new Prisma.Decimal(150),
        },
    ]);
    prismaMock.notification.findFirst.mockResolvedValue({ id: "n1" });
    await runExpenseUpcomingNotificationJob();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
});

// ---- auth.service ----

test("setupStatus reports that setup is needed when there are no users", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    expect(await authService.setupStatus()).toEqual({ needsSetup: true });
});

test("setup creates the first admin user and issues tokens", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.create.mockResolvedValue({ id: "u1", role: "ADMIN" });
    prismaMock.userSession.create.mockResolvedValue({ id: "session1" });
    const app = fakeApp();
    const result = await authService.setup(app, { name: "Ana", username: "ana123", password: "supersecurepassword" });
    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken.startsWith("session1.")).toBeTrue();
    const payload = prismaMock.user.create.mock.calls[0][0].data;
    expect(payload).toMatchObject({ name: "Ana", username: "ana123", role: "ADMIN" });
    expect(typeof payload.passwordHash).toBe("string");
});

test("setup rejects when the initial setup was already completed", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    await expect(
        authService.setup(fakeApp(), { name: "Ana", username: "ana123", password: "supersecurepassword" }),
    ).rejects.toMatchObject({ statusCode: 409, message: "Initial setup already completed" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
});

test("setup treats a concurrent unique-constraint race as already completed", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.create.mockImplementation(() => {
        throw Object.assign(new Error("duplicate"), { code: "P2002" });
    });
    await expect(
        authService.setup(fakeApp(), { name: "Ana", username: "ana123", password: "supersecurepassword" }),
    ).rejects.toMatchObject({ statusCode: 409, message: "Initial setup already completed" });
});

test("setup rethrows unrelated transaction errors", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.create.mockImplementation(() => {
        throw new Error("connection lost");
    });
    await expect(
        authService.setup(fakeApp(), { name: "Ana", username: "ana123", password: "supersecurepassword" }),
    ).rejects.toThrow("connection lost");
});

test("login rejects when the user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(authService.login(fakeApp(), "nouser", "pass")).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid username or password",
    });
});

test("login rejects when the user is not active", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", status: "INACTIVE" });
    await expect(authService.login(fakeApp(), "user", "pass")).rejects.toMatchObject({ statusCode: 401 });
});

test("login rejects on a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
        id: "u1",
        status: "ACTIVE",
        passwordHash: await argon2.hash("correct-password"),
    });
    await expect(authService.login(fakeApp(), "user", "wrong-password")).rejects.toMatchObject({ statusCode: 401 });
});

test("login issues tokens on success", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
        id: "u1",
        role: "MANAGER",
        status: "ACTIVE",
        passwordHash: await argon2.hash("correct-password"),
    });
    prismaMock.userSession.create.mockResolvedValue({ id: "session2" });
    const result = await authService.login(fakeApp(), "user", "correct-password");
    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken.startsWith("session2.")).toBeTrue();
});

test("refresh rejects a malformed refresh token", async () => {
    await expect(authService.refresh(fakeApp(), "no-dot-token-12345")).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid refresh token",
    });
});

test("refresh rejects when the session does not exist", async () => {
    prismaMock.userSession.findUnique.mockResolvedValue(null);
    await expect(authService.refresh(fakeApp(), "session1.secret")).rejects.toMatchObject({ statusCode: 401 });
});

test("refresh rejects a revoked session", async () => {
    prismaMock.userSession.findUnique.mockResolvedValue({
        id: "session1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
        tokenHash: "x",
        user: { id: "u1", role: "ADMIN" },
    });
    await expect(authService.refresh(fakeApp(), "session1.secret")).rejects.toMatchObject({ statusCode: 401 });
});

test("refresh rejects an expired session", async () => {
    prismaMock.userSession.findUnique.mockResolvedValue({
        id: "session1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
        tokenHash: "x",
        user: { id: "u1", role: "ADMIN" },
    });
    await expect(authService.refresh(fakeApp(), "session1.secret")).rejects.toMatchObject({ statusCode: 401 });
});

test("refresh rejects when the secret does not match", async () => {
    prismaMock.userSession.findUnique.mockResolvedValue({
        id: "session1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
        tokenHash: await argon2.hash("good-secret"),
        user: { id: "u1", role: "ADMIN" },
    });
    await expect(authService.refresh(fakeApp(), "session1.wrong-secret")).rejects.toMatchObject({ statusCode: 401 });
});

test("refresh revokes the current session and issues new tokens", async () => {
    prismaMock.userSession.findUnique.mockResolvedValue({
        id: "session1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
        tokenHash: await argon2.hash("good-secret"),
        user: { id: "u1", role: "ADMIN" },
    });
    prismaMock.userSession.update.mockResolvedValue({});
    prismaMock.userSession.create.mockResolvedValue({ id: "session3" });
    const result = await authService.refresh(fakeApp(), "session1.good-secret");
    expect(result.accessToken).toBe("signed-token");
    expect(prismaMock.userSession.update).toHaveBeenCalledWith({
        where: { id: "session1" },
        data: { revokedAt: expect.any(Date) },
    });
});

test("logout revokes the session tied to the refresh token", async () => {
    prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });
    await authService.logout("session1.secret", "user1");
    expect(prismaMock.userSession.updateMany).toHaveBeenCalledWith({
        where: { id: "session1", userId: "user1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
    });
});

test("logout is a no-op when the refresh token has no session id", async () => {
    await authService.logout("", "user1");
    expect(prismaMock.userSession.updateMany).not.toHaveBeenCalled();
});

test("me rejects when the user is missing or inactive", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(authService.me("missing")).rejects.toMatchObject({ statusCode: 401 });
});

test("me returns the active user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", name: "Ana" });
    expect(await authService.me("u1")).toEqual({ id: "u1", status: "ACTIVE", name: "Ana" });
});

// ---- users.service ----

test("users list returns empty when the search finds no matches", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    const result = await usersService.list("nobody", undefined, 0, 20);
    expect(result).toEqual({ data: [], total: 0 });
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
});

test("users list filters by status when given", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1" }]);
    prismaMock.user.count.mockResolvedValue(1);
    await usersService.list(undefined, "ACTIVE", 0, 20);
    expect(prismaMock.user.findMany.mock.calls[0][0].where).toEqual({ status: "ACTIVE" });
});

test("users create hashes the password and strips it from the payload", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u1" });
    await usersService.create({ password: "supersecurepassword", name: "Ana", username: "ana" }, "creator1");
    const payload = prismaMock.user.create.mock.calls[0][0].data;
    expect(payload.password).toBeUndefined();
    expect(typeof payload.passwordHash).toBe("string");
    expect(payload.createdUserId).toBe("creator1");
});

test("users create rejects a duplicate username", async () => {
    prismaMock.user.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["username"]);
    });
    await expect(
        usersService.create({ password: "supersecurepassword", name: "Ana", username: "ana" }, "creator1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "Username already exists" });
});

test("users create rejects a duplicate name", async () => {
    prismaMock.user.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(
        usersService.create({ password: "supersecurepassword", name: "Ana", username: "ana" }, "creator1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "User already exists" });
});

test("users update throws 404 when the user is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(usersService.update("missing", { name: "Ana" })).rejects.toMatchObject({ statusCode: 404 });
});

test("users update rehashes the password only when a new one is given", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockResolvedValue({ id: "u1" });
    await usersService.update("u1", { name: "Ana nova" });
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ name: "Ana nova" });

    prismaMock.user.update.mockResolvedValue({ id: "u1" });
    await usersService.update("u1", { password: "brandnewpassword123" });
    const payload = prismaMock.user.update.mock.calls[1][0].data;
    expect(typeof payload.passwordHash).toBe("string");
    expect(payload.password).toBeUndefined();
});

test("users update rejects a duplicate username", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockImplementation(() => {
        throw prismaKnownError("P2002", ["username"]);
    });
    await expect(usersService.update("u1", { username: "existing" })).rejects.toMatchObject({ statusCode: 409 });
});

test("users update rejects a duplicate name", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(usersService.update("u1", { name: "existing" })).rejects.toMatchObject({
        statusCode: 409,
        message: "User already exists",
    });
});

test("users archive rejects archiving the current user", async () => {
    await expect(usersService.archive("u1", "u1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Cannot archive the current user",
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});

test("users archive throws 404 when the user is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(usersService.archive("missing", "current")).rejects.toMatchObject({ statusCode: 404 });
});

test("users archive updates the status", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockResolvedValue({});
    await usersService.archive("u1", "current");
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { status: "ARCHIVED" } });
});

test("users restore throws 404 when the user is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(usersService.restore("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("users restore reactivates the user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockResolvedValue({});
    await usersService.restore("u1");
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { status: "ACTIVE" } });
});

// ---- suppliers.service ----

test("suppliers list excludes archived by default", async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.count.mockResolvedValue(0);
    await suppliersService.list({ skip: 0, take: 20 });
    expect(prismaMock.supplier.findMany.mock.calls[0][0].where).toEqual({ status: { not: "ARCHIVED" } });
});

test("suppliers list includes archived when requested", async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.count.mockResolvedValue(0);
    await suppliersService.list({ includeArchived: true, skip: 0, take: 20 });
    expect(prismaMock.supplier.findMany.mock.calls[0][0].where).toEqual({});
});

test("suppliers list returns empty when the search finds no matches", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    const result = await suppliersService.list({ search: "nobody", skip: 0, take: 20 });
    expect(result).toEqual({ data: [], total: 0 });
    expect(prismaMock.supplier.findMany).not.toHaveBeenCalled();
});

test("suppliers create rejects a duplicate name", async () => {
    prismaMock.supplier.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(suppliersService.create({ name: "Fornecedor" }, "user1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Supplier already exists",
    });
});

test("suppliers update throws 404 when the supplier is missing", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    await expect(suppliersService.update("missing", { name: "X" })).rejects.toMatchObject({ statusCode: 404 });
});

test("suppliers update rejects a duplicate name", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: "s1" });
    prismaMock.supplier.update.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(suppliersService.update("s1", { name: "X" })).rejects.toMatchObject({ statusCode: 409 });
});

test("suppliers archive throws 404 when the supplier is missing", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    await expect(suppliersService.archive("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("suppliers archive updates the status", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: "s1" });
    prismaMock.supplier.update.mockResolvedValue({});
    await suppliersService.archive("s1");
    expect(prismaMock.supplier.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "ARCHIVED" } });
});

test("suppliers restore throws 404 when the supplier is missing", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    await expect(suppliersService.restore("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("suppliers restore reactivates the supplier", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: "s1" });
    prismaMock.supplier.update.mockResolvedValue({});
    await suppliersService.restore("s1");
    expect(prismaMock.supplier.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "ACTIVE" } });
});

test("suppliers permanentDelete rejects when there are linked stock batches", async () => {
    prismaMock.stockBatch.count.mockResolvedValue(2);
    await expect(suppliersService.permanentDelete("s1")).rejects.toMatchObject({
        statusCode: 409,
        details: [{ label: "lote(s) de estoque", path: "/dashboard/stock/batches", count: 2 }],
    });
    expect(prismaMock.supplier.delete).not.toHaveBeenCalled();
});

test("suppliers permanentDelete removes the supplier when nothing is linked", async () => {
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.supplier.delete.mockResolvedValue({});
    await suppliersService.permanentDelete("s1");
    expect(prismaMock.supplier.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
});

test("suppliers permanentDelete maps a foreign-key violation to a 409", async () => {
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.supplier.delete.mockImplementation(() => {
        throw prismaKnownError("P2003");
    });
    await expect(suppliersService.permanentDelete("s1")).rejects.toMatchObject({ statusCode: 409 });
});

test("suppliers permanentDelete rethrows unrelated errors", async () => {
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.supplier.delete.mockImplementation(() => {
        throw new Error("connection lost");
    });
    await expect(suppliersService.permanentDelete("s1")).rejects.toThrow("connection lost");
});

// ---- catalog.service ----

test("catalog get throws 404 when the resource is missing", async () => {
    prismaMock.quantityType.findFirst.mockResolvedValue(null);
    await expect(catalogService.get(quantityTypeResource, "missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("catalog get returns the non-archived resource", async () => {
    prismaMock.quantityType.findFirst.mockResolvedValue({ id: "qt1", name: "Kg" });
    expect(await catalogService.get(quantityTypeResource, "qt1")).toEqual({ id: "qt1", name: "Kg" });
});

test("catalog list returns empty when the search finds no matches", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    const [data, total] = await catalogService.list(debtorResource, {}, 0, 20, undefined, "nobody");
    expect(data).toEqual([]);
    expect(total).toBe(0);
    expect(prismaMock.debtor.findMany).not.toHaveBeenCalled();
});

test("catalog list orders debtors by name", async () => {
    prismaMock.debtor.findMany.mockResolvedValue([{ id: "d1" }]);
    prismaMock.debtor.count.mockResolvedValue(1);
    await catalogService.list(debtorResource, {}, 0, 20);
    expect(prismaMock.debtor.findMany.mock.calls[0][0].orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
});

test("catalog list orders other resources by createdAt desc", async () => {
    prismaMock.quantityType.findMany.mockResolvedValue([]);
    prismaMock.quantityType.count.mockResolvedValue(0);
    await catalogService.list(quantityTypeResource, {}, 0, 20);
    expect(prismaMock.quantityType.findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
});

test("catalog list ranks products by stock when stockOrder is given", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "p1", stockQuantity: new Prisma.Decimal(5) }]);
    prismaMock.product.count.mockResolvedValue(1);
    const [data, total] = await catalogService.list(productResource, { status: "ACTIVE" }, 0, 20, "desc");
    expect(data).toEqual([{ id: "p1", stockQuantity: new Prisma.Decimal(5) }]);
    expect(total).toBe(1);
    expect(prismaMock.product.count).toHaveBeenCalledWith({ where: { status: "ACTIVE" } });
});

test("catalog list attaches stock balances to products without stockOrder", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    prismaMock.product.count.mockResolvedValue(2);
    prismaMock.stockBatch.groupBy.mockResolvedValue([
        { productId: "p1", _sum: { quantityLeft: new Prisma.Decimal(3) } },
    ]);
    const [data] = await catalogService.list(productResource, {}, 0, 20);
    expect(data).toEqual([
        { id: "p1", stockQuantity: new Prisma.Decimal(3) },
        { id: "p2", stockQuantity: new Prisma.Decimal(0) },
    ]);
});

test("catalog list skips the stock balance query when there are no products", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);
    await catalogService.list(productResource, {}, 0, 20);
    expect(prismaMock.stockBatch.groupBy).not.toHaveBeenCalled();
});

test("catalog create rejects when only one of initialQuantity/initialQuantityTypeId is given", async () => {
    await expect(
        catalogService.create(productResource, { name: "Trufa", type: "RAW_MATERIAL", initialQuantity: 5 }, "user"),
    ).rejects.toMatchObject({
        statusCode: 400,
        message: "initialQuantity and initialQuantityTypeId must be provided together",
    });
});

test("catalog create seeds an initial stock batch for products with an opening quantity", async () => {
    prismaMock.product.create.mockResolvedValue({ id: "p1" });
    prismaMock.stockBatch.create.mockResolvedValue({ id: "batch1", productId: "p1" });
    prismaMock.stockMovement.create.mockResolvedValue({ id: "movement1" });
    const item = await catalogService.create(
        productResource,
        { name: "Creme", type: "RAW_MATERIAL", initialQuantity: 10, initialQuantityTypeId: "qt1" },
        "user1",
    );
    expect(item).toEqual({ id: "p1" });
    expect(prismaMock.stockBatch.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: "product", action: "CREATE" }) }),
    );
});

test("catalog create rejects a duplicate name", async () => {
    prismaMock.quantityType.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(catalogService.create(quantityTypeResource, { name: "Kg" }, "user1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Quantity type already exists",
    });
});

test("catalog create persists a plain resource", async () => {
    prismaMock.quantityType.create.mockResolvedValue({ id: "qt1" });
    const item = await catalogService.create(quantityTypeResource, { name: "Kg" }, "user1");
    expect(item).toEqual({ id: "qt1" });
});

test("catalog update throws 404 when the resource is missing", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue(null);
    await expect(catalogService.update(debtorResource, "missing", { name: "X" }, "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("catalog update rejects a duplicate name", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue({ id: "d1" });
    prismaMock.debtor.update.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(catalogService.update(debtorResource, "d1", { name: "X" }, "user1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Debtor already exists",
    });
});

test("catalog update persists a plain resource and records the audit trail", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue({ id: "d1", name: "Old" });
    prismaMock.debtor.update.mockResolvedValue({ id: "d1", name: "New" });
    const item = await catalogService.update(debtorResource, "d1", { name: "New" }, "user1");
    expect(item).toEqual({ id: "d1", name: "New" });
    expect(prismaMock.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: "debtor", action: "UPDATE" }) }),
    );
});

test("catalog archive throws 404 when the resource is missing", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue(null);
    await expect(catalogService.archive(quantityTypeResource, "missing", "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("catalog archive marks the resource as archived", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue({ id: "qt1" });
    prismaMock.quantityType.update.mockResolvedValue({ id: "qt1", status: "ARCHIVED" });
    await catalogService.archive(quantityTypeResource, "qt1", "user1");
    expect(prismaMock.quantityType.update).toHaveBeenCalledWith({
        where: { id: "qt1" },
        data: { status: "ARCHIVED" },
    });
});

test("catalog restore throws 404 when the resource is missing", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue(null);
    await expect(catalogService.restore(debtorResource, "missing", "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("catalog restore reactivates a plain resource", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue({ id: "d1" });
    prismaMock.debtor.update.mockResolvedValue({ id: "d1", status: "ACTIVE" });
    await catalogService.restore(debtorResource, "d1", "user1");
    expect(prismaMock.debtor.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { status: "ACTIVE" } });
});

test("catalog permanentDelete throws 404 when the resource is missing", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue(null);
    await expect(catalogService.permanentDelete(quantityTypeResource, "missing", "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("catalog permanentDelete rejects a quantity type with linked stock batches", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue({ id: "qt1" });
    prismaMock.stockBatch.count.mockResolvedValue(3);
    await expect(catalogService.permanentDelete(quantityTypeResource, "qt1", "user1")).rejects.toMatchObject({
        statusCode: 409,
        details: [{ label: "lote(s) de estoque", path: "/dashboard/stock/batches", count: 3 }],
    });
    expect(prismaMock.quantityType.delete).not.toHaveBeenCalled();
});

test("catalog permanentDelete rejects a product with linked batches and sale items", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", name: "Creme" });
    prismaMock.stockBatch.count.mockResolvedValue(1);
    prismaMock.saleItem.count.mockResolvedValue(2);
    await expect(catalogService.permanentDelete(productResource, "p1", "user1")).rejects.toMatchObject({
        statusCode: 409,
        details: [
            {
                label: "lote(s) de estoque",
                path: "/dashboard/stock/batches",
                count: 1,
                query: { productId: "p1", productName: "Creme" },
            },
            {
                label: "item(ns) de venda",
                path: "/dashboard/sales",
                count: 2,
                query: { productId: "p1", productName: "Creme" },
            },
        ],
    });
});

test("catalog permanentDelete rejects a debtor with sales", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue({ id: "d1" });
    prismaMock.sale.count.mockResolvedValue(1);
    await expect(catalogService.permanentDelete(debtorResource, "d1", "user1")).rejects.toMatchObject({
        statusCode: 409,
    });
});

test("catalog permanentDelete rejects an expense template with expenses", async () => {
    prismaMock.expenseTemplate.findUnique.mockResolvedValue({ id: "et1" });
    prismaMock.expense.count.mockResolvedValue(1);
    await expect(catalogService.permanentDelete(expenseTemplateResource, "et1", "user1")).rejects.toMatchObject({
        statusCode: 409,
    });
});

test("catalog permanentDelete removes the resource when nothing is linked", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue({ id: "qt1" });
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.quantityType.delete.mockResolvedValue({});
    await catalogService.permanentDelete(quantityTypeResource, "qt1", "user1");
    expect(prismaMock.quantityType.delete).toHaveBeenCalledWith({ where: { id: "qt1" } });
    expect(prismaMock.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: "quantityType", action: "DELETE" }) }),
    );
});

test("catalog permanentDelete maps a foreign-key violation to a 409", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue({ id: "qt1" });
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.quantityType.delete.mockImplementation(() => {
        throw prismaKnownError("P2003");
    });
    await expect(catalogService.permanentDelete(quantityTypeResource, "qt1", "user1")).rejects.toMatchObject({
        statusCode: 409,
    });
});

test("catalog permanentDelete rethrows unrelated errors", async () => {
    prismaMock.quantityType.findUnique.mockResolvedValue({ id: "qt1" });
    prismaMock.stockBatch.count.mockResolvedValue(0);
    prismaMock.quantityType.delete.mockImplementation(() => {
        throw new Error("connection lost");
    });
    await expect(catalogService.permanentDelete(quantityTypeResource, "qt1", "user1")).rejects.toThrow(
        "connection lost",
    );
});

test("catalog createUser hashes the password and audits the creation", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u1" });
    const user = await catalogService.createUser(
        { password: "supersecurepassword", name: "Ana", username: "ana" },
        "creator1",
    );
    expect(user).toEqual({ id: "u1" });
    const payload = prismaMock.user.create.mock.calls[0][0].data;
    expect(payload.password).toBeUndefined();
    expect(typeof payload.passwordHash).toBe("string");
    expect(prismaMock.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: "user", action: "CREATE" }) }),
    );
});

test("catalog createUser rejects a duplicate username", async () => {
    prismaMock.user.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["username"]);
    });
    await expect(
        catalogService.createUser({ password: "supersecurepassword", name: "Ana", username: "ana" }, "creator1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "Username already exists" });
});

test("catalog createUser rejects a duplicate name", async () => {
    prismaMock.user.create.mockImplementation(() => {
        throw prismaKnownError("P2002", ["name"]);
    });
    await expect(
        catalogService.createUser({ password: "supersecurepassword", name: "Ana", username: "ana" }, "creator1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "User already exists" });
});

// ---- stock.service (beyond createBatch/adjustBatch already covered above) ----

test("stock addNoCostStock creates a zero-cost batch and inbound movement", async () => {
    prismaMock.stockBatch.create.mockResolvedValue({ id: "batch1", productId: "p1" });
    prismaMock.stockMovement.create.mockResolvedValue({ id: "movement1" });
    const result = await stockService.addNoCostStock({ productId: "p1", quantityTypeId: "qt1", quantity: 4 }, "user1");
    expect(result).toEqual({ id: "batch1", productId: "p1" });
    expect(prismaMock.stockBatch.create.mock.calls[0][0].data).toMatchObject({ priceBuy: 0, quantityIn: 4 });
    expect(prismaMock.stockMovement.create.mock.calls[0][0].data).toMatchObject({ type: "IN", quantity: 4 });
});

test("stock updateBatch throws 404 when the batch is missing", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue(null);
    await expect(
        stockService.updateBatch("missing", {
            supplierId: "s1",
            productId: "p1",
            quantityTypeId: "qt1",
            quantityIn: 1,
            priceBuy: 1,
            dateBuy: new Date(),
            notifyLimit: false,
        }),
    ).rejects.toMatchObject({ statusCode: 404 });
});

test("stock updateBatch rejects editing a batch that already had sales", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        productId: "p1",
        saleItems: [{ id: "si1" }],
        movements: [],
    });
    await expect(
        stockService.updateBatch("b1", {
            supplierId: "s1",
            productId: "p1",
            quantityTypeId: "qt1",
            quantityIn: 1,
            priceBuy: 1,
            dateBuy: new Date(),
            notifyLimit: false,
        }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.stockBatch.update).not.toHaveBeenCalled();
});

test("stock updateBatch rejects editing a batch with non-inbound movements", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        productId: "p1",
        saleItems: [],
        movements: [{ type: "OUT" }],
    });
    await expect(
        stockService.updateBatch("b1", {
            supplierId: "s1",
            productId: "p1",
            quantityTypeId: "qt1",
            quantityIn: 1,
            priceBuy: 1,
            dateBuy: new Date(),
            notifyLimit: false,
        }),
    ).rejects.toMatchObject({ statusCode: 409 });
});

test("stock updateBatch updates the linked cash movement value", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        productId: "old-product",
        createdUserId: "user1",
        saleItems: [],
        movements: [{ type: "IN" }],
        cashMovement: { id: "cm1" },
    });
    prismaMock.stockBatch.update.mockResolvedValue({ id: "b1", productId: "new-product" });
    prismaMock.stockMovement.updateMany.mockResolvedValue({ count: 1 });
    const result = await stockService.updateBatch("b1", {
        supplierId: "s1",
        productId: "new-product",
        quantityTypeId: "qt1",
        quantityIn: 5,
        priceBuy: 10,
        dateBuy: new Date(),
        notifyLimit: false,
    });
    expect(result).toEqual({ batch: { id: "b1", productId: "new-product" }, previousProductId: "old-product" });
    expect(prismaMock.cashMovement.update).toHaveBeenCalledTimes(1);
    const [{ where, data }] = prismaMock.cashMovement.update.mock.calls[0];
    expect(where).toEqual({ id: "cm1" });
    expect(data.value.toString()).toBe("50");
    expect(prismaMock.cashMovement.create).not.toHaveBeenCalled();
});

test("stock updateBatch creates a cash movement when the batch had none", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        productId: "old-product",
        createdUserId: "user1",
        saleItems: [],
        movements: [{ type: "IN" }],
        cashMovement: null,
    });
    prismaMock.stockBatch.update.mockResolvedValue({ id: "b1", productId: "new-product" });
    prismaMock.stockMovement.updateMany.mockResolvedValue({ count: 1 });
    await stockService.updateBatch("b1", {
        supplierId: "s1",
        productId: "new-product",
        quantityTypeId: "qt1",
        quantityIn: 5,
        priceBuy: 10,
        dateBuy: new Date(),
        notifyLimit: false,
    });
    expect(prismaMock.cashMovement.update).not.toHaveBeenCalled();
    const cashMovementData = prismaMock.cashMovement.create.mock.calls[0][0].data;
    expect(cashMovementData.value.toString()).toBe("50");
    expect(cashMovementData).toMatchObject({
        type: "WITHDRAWAL",
        stockBatchId: "b1",
        createdUserId: "user1",
    });
});

test("stock deleteBatch throws 404 when the batch is missing", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue(null);
    await expect(stockService.deleteBatch("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("stock deleteBatch rejects deleting a batch that already had movements", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        saleItems: [],
        movements: [{ type: "ADJUSTMENT" }],
    });
    await expect(stockService.deleteBatch("b1")).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.stockBatch.delete).not.toHaveBeenCalled();
});

test("stock deleteBatch removes an untouched batch", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({ id: "b1", saleItems: [], movements: [{ type: "IN" }] });
    prismaMock.stockBatch.delete.mockResolvedValue({});
    const result = await stockService.deleteBatch("b1");
    expect(result).toEqual({ id: "b1", saleItems: [], movements: [{ type: "IN" }] });
    expect(prismaMock.stockBatch.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
});

test("stock getProductStock throws 404 when the product is missing", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.stockBatch.findMany.mockResolvedValue([]);
    prismaMock.stockBatch.aggregate.mockResolvedValue({ _sum: { quantityLeft: null } });
    await expect(stockService.getProductStock("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("stock getProductStock returns the product with its available balance", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", name: "Creme" });
    prismaMock.stockBatch.findMany.mockResolvedValue([{ id: "b1" }]);
    prismaMock.stockBatch.aggregate.mockResolvedValue({ _sum: { quantityLeft: new Prisma.Decimal(7) } });
    const result = await stockService.getProductStock("p1");
    expect(result.product).toEqual({ id: "p1", name: "Creme" });
    expect(result.available.toString()).toBe("7");
    expect(result.batches).toEqual([{ id: "b1" }]);
});

test("stock adjustBatch applies a positive adjustment and logs the movement", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({
        id: "b1",
        status: "ACTIVE",
        productId: "p1",
        quantityLeft: new Prisma.Decimal(5),
        priceBuy: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.update.mockResolvedValue({ id: "b1", quantityLeft: new Prisma.Decimal(8) });
    prismaMock.stockMovement.create.mockResolvedValue({});
    const batch = await stockService.adjustBatch("b1", 3, "contagem", "user1");
    expect(batch).toEqual({ id: "b1", quantityLeft: new Prisma.Decimal(8) });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith({
        data: {
            type: "ADJUSTMENT",
            productId: "p1",
            stockBatchId: "b1",
            quantity: 3,
            costUnit: new Prisma.Decimal(10),
            obs: "contagem",
            createdUserId: "user1",
        },
    });
});

test("stock adjustBatch throws 404 when the batch is not active", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({ id: "b1", status: "ARCHIVED" });
    await expect(stockService.adjustBatch("b1", 1, "obs", "user1")).rejects.toMatchObject({ statusCode: 404 });
});

test("stock getBatch throws 404 when the batch is missing", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue(null);
    await expect(stockService.getBatch("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("stock getBatch returns the batch with its relations", async () => {
    prismaMock.stockBatch.findUnique.mockResolvedValue({ id: "b1" });
    expect(await stockService.getBatch("b1")).toEqual({ id: "b1" });
});

test("stock searchBatchIds resolves matching batch ids", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "b1" }, { id: "b2" }]);
    expect(await stockService.searchBatchIds("creme")).toEqual(["b1", "b2"]);
});

test("stock listBatches paginates with the given filters", async () => {
    prismaMock.stockBatch.findMany.mockResolvedValue([{ id: "b1" }]);
    prismaMock.stockBatch.count.mockResolvedValue(1);
    const result = await stockService.listBatches({ status: "ACTIVE" }, 0, 20);
    expect(result).toEqual({ data: [{ id: "b1" }], total: 1 });
});

test("stock listAlerts only returns batches at or below their notify threshold", async () => {
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { id: "b1", quantityLeft: new Prisma.Decimal(5), quantityNotify: new Prisma.Decimal(10) },
        { id: "b2", quantityLeft: new Prisma.Decimal(5), quantityNotify: new Prisma.Decimal(2) },
    ]);
    const result = await stockService.listAlerts(0, 10);
    expect(result).toEqual({
        data: [{ id: "b1", quantityLeft: new Prisma.Decimal(5), quantityNotify: new Prisma.Decimal(10) }],
        total: 1,
    });
});

test("stock listMovements paginates with the given filters", async () => {
    prismaMock.stockMovement.findMany.mockResolvedValue([{ id: "m1" }]);
    prismaMock.stockMovement.count.mockResolvedValue(1);
    const result = await stockService.listMovements({}, 0, 20);
    expect(result).toEqual({ data: [{ id: "m1" }], total: 1 });
});

// ---- sales.service ----

test("sales create throws 404 when the product is missing", async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    await expect(
        salesService.create({ status: "PENDING", items: [{ productId: "missing", quantity: 1 }] }, "user1"),
    ).rejects.toMatchObject({ statusCode: 404 });
});

test("sales create rejects when the product has no default price and none was given", async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: "p1", name: "Bolo", type: "FINISHED", priceSell: null });
    await expect(
        salesService.create({ status: "PENDING", items: [{ productId: "p1", quantity: 1 }] }, "user1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "Bolo has no default sale price defined" });
});

test("sales create rejects when there is not enough stock", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
        id: "p1",
        name: "Bolo",
        type: "FINISHED",
        priceSell: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.findMany.mockResolvedValue([]);
    await expect(
        salesService.create({ status: "PENDING", items: [{ productId: "p1", quantity: 2 }] }, "user1"),
    ).rejects.toMatchObject({ statusCode: 409, message: "Insufficient stock for Bolo" });
});

test("sales create allocates FIFO batches and records a payment when paid", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
        id: "p1",
        name: "Bolo",
        type: "FINISHED",
        priceSell: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { id: "b1", quantityLeft: new Prisma.Decimal(1), priceBuy: new Prisma.Decimal(4) },
        { id: "b2", quantityLeft: new Prisma.Decimal(5), priceBuy: new Prisma.Decimal(5) },
    ]);
    prismaMock.sale.create.mockResolvedValue({ id: "sale1" });
    prismaMock.saleItem.create.mockResolvedValue({});
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.payment.create.mockResolvedValue({});
    prismaMock.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale1", items: [], payments: [] });
    const result = await salesService.create(
        { status: "PAID", paymentMethod: "CASH", items: [{ productId: "p1", quantity: 2 }] },
        "user1",
    );
    expect(result).toEqual({ id: "sale1", items: [], payments: [] });
    expect(prismaMock.saleItem.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
        data: { saleId: "sale1", amount: new Prisma.Decimal(20), method: "CASH", createdUserId: "user1" },
    });
});

test("sales create does not record a payment for a pending sale", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
        id: "p1",
        name: "Bolo",
        type: "FINISHED",
        priceSell: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { id: "b1", quantityLeft: new Prisma.Decimal(5), priceBuy: new Prisma.Decimal(4) },
    ]);
    prismaMock.sale.create.mockResolvedValue({ id: "sale1" });
    prismaMock.saleItem.create.mockResolvedValue({});
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale1", items: [], payments: [] });
    await salesService.create({ status: "PENDING", items: [{ productId: "p1", quantity: 1 }] }, "user1");
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
});

test("sales update throws 404 when the sale is missing", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    await expect(
        salesService.update("missing", { status: "PENDING", items: [{ productId: "p1", quantity: 1 }] }, "user1"),
    ).rejects.toMatchObject({ statusCode: 404 });
});

test("sales update rejects editing a canceled sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: "s1", status: "CANCELED", items: [], payments: [] });
    await expect(
        salesService.update("s1", { status: "PENDING", items: [{ productId: "p1", quantity: 1 }] }, "user1"),
    ).rejects.toMatchObject({ statusCode: 409 });
});

test("sales update reverts previous allocations before re-allocating", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        items: [{ stockBatchId: "b1", quantity: new Prisma.Decimal(2) }],
        payments: [],
    });
    prismaMock.stockBatch.update.mockResolvedValue({});
    prismaMock.stockMovement.deleteMany.mockResolvedValue({});
    prismaMock.saleItem.deleteMany.mockResolvedValue({});
    prismaMock.payment.deleteMany.mockResolvedValue({});
    prismaMock.product.findFirst.mockResolvedValue({
        id: "p1",
        name: "Bolo",
        type: "FINISHED",
        priceSell: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { id: "b2", quantityLeft: new Prisma.Decimal(5), priceBuy: new Prisma.Decimal(4) },
    ]);
    prismaMock.sale.update.mockResolvedValue({});
    prismaMock.saleItem.create.mockResolvedValue({});
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.sale.findUniqueOrThrow.mockResolvedValue({ id: "s1", items: [], payments: [] });
    await salesService.update("s1", { status: "PENDING", items: [{ productId: "p1", quantity: 1 }] }, "user1");
    expect(prismaMock.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: { quantityLeft: { increment: new Prisma.Decimal(2) } },
    });
    expect(prismaMock.stockMovement.deleteMany).toHaveBeenCalledWith({ where: { saleId: "s1" } });
});

test("sales update records a new payment when re-saved as paid", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        items: [],
        payments: [],
    });
    prismaMock.stockMovement.deleteMany.mockResolvedValue({});
    prismaMock.saleItem.deleteMany.mockResolvedValue({});
    prismaMock.payment.deleteMany.mockResolvedValue({});
    prismaMock.product.findFirst.mockResolvedValue({
        id: "p1",
        name: "Bolo",
        type: "FINISHED",
        priceSell: new Prisma.Decimal(10),
    });
    prismaMock.stockBatch.findMany.mockResolvedValue([
        { id: "b2", quantityLeft: new Prisma.Decimal(5), priceBuy: new Prisma.Decimal(4) },
    ]);
    prismaMock.sale.update.mockResolvedValue({});
    prismaMock.saleItem.create.mockResolvedValue({});
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.payment.create.mockResolvedValue({});
    prismaMock.sale.findUniqueOrThrow.mockResolvedValue({ id: "s1", items: [], payments: [] });
    await salesService.update(
        "s1",
        { status: "PAID", paymentMethod: "PIX", items: [{ productId: "p1", quantity: 1 }] },
        "user1",
    );
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
        data: { saleId: "s1", amount: new Prisma.Decimal(10), method: "PIX", createdUserId: "user1" },
    });
});

test("sales delete throws 404 when the sale is missing", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    await expect(salesService.delete("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("sales delete restores stock for an active sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        items: [{ stockBatchId: "b1", quantity: new Prisma.Decimal(2) }],
    });
    prismaMock.stockBatch.update.mockResolvedValue({});
    prismaMock.sale.delete.mockResolvedValue({});
    await salesService.delete("s1");
    expect(prismaMock.stockBatch.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: { quantityLeft: { increment: new Prisma.Decimal(2) } },
    });
    expect(prismaMock.sale.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
});

test("sales delete does not restore stock for an already-canceled sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "CANCELED",
        items: [{ stockBatchId: "b1", quantity: new Prisma.Decimal(2) }],
    });
    prismaMock.sale.delete.mockResolvedValue({});
    await salesService.delete("s1");
    expect(prismaMock.stockBatch.update).not.toHaveBeenCalled();
});

test("sales list paginates with the given filters", async () => {
    prismaMock.sale.findMany.mockResolvedValue([{ id: "s1" }]);
    prismaMock.sale.count.mockResolvedValue(1);
    const result = await salesService.list({}, 0, 20);
    expect(result).toEqual({ data: [{ id: "s1" }], total: 1 });
});

test("sales get throws 404 when the sale is missing", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    await expect(salesService.get("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("sales get returns the sale with its relations", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: "s1" });
    expect(await salesService.get("s1")).toEqual({ id: "s1" });
});

test("sales addPayment throws 404 when the sale is missing", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    await expect(salesService.addPayment("missing", 10, "CASH", undefined, "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("sales addPayment rejects payments on canceled or free sales", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: "s1", status: "CANCELED", payments: [] });
    await expect(salesService.addPayment("s1", 10, "CASH", undefined, "user1")).rejects.toMatchObject({
        statusCode: 409,
    });
});

test("sales addPayment rejects a payment that exceeds the sale total", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        total: new Prisma.Decimal(100),
        payments: [{ amount: new Prisma.Decimal(80) }],
    });
    await expect(salesService.addPayment("s1", 30, "CASH", undefined, "user1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Payment exceeds sale total",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
});

test("sales addPayment marks the sale as paid once the balance is settled", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        total: new Prisma.Decimal(100),
        payments: [{ amount: new Prisma.Decimal(80) }],
    });
    prismaMock.payment.create.mockResolvedValue({ id: "pay1" });
    prismaMock.sale.update.mockResolvedValue({});
    await salesService.addPayment("s1", 20, "CASH", undefined, "user1");
    expect(prismaMock.sale.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "PAID" } });
});

test("sales addPayment keeps the sale pending when the balance is not settled", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        total: new Prisma.Decimal(100),
        payments: [],
    });
    prismaMock.payment.create.mockResolvedValue({ id: "pay1" });
    await salesService.addPayment("s1", 20, "CASH", undefined, "user1");
    expect(prismaMock.sale.update).not.toHaveBeenCalled();
});

test("sales cancel throws 404 when the sale is missing", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    await expect(salesService.cancel("missing", "user1")).rejects.toMatchObject({ statusCode: 404 });
});

test("sales cancel rejects an already-canceled sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: "s1", status: "CANCELED", items: [] });
    await expect(salesService.cancel("s1", "user1")).rejects.toMatchObject({ statusCode: 409 });
});

test("sales cancel restores stock and reverses each item", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
        id: "s1",
        status: "PENDING",
        items: [{ productId: "p1", stockBatchId: "b1", quantity: new Prisma.Decimal(2) }],
    });
    prismaMock.stockBatch.update.mockResolvedValue({ priceBuy: new Prisma.Decimal(5) });
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.sale.update.mockResolvedValue({ id: "s1", status: "CANCELED", items: [] });
    const result = await salesService.cancel("s1", "user1");
    expect(result).toEqual({ id: "s1", status: "CANCELED", items: [] });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith({
        data: {
            type: "REVERSAL",
            productId: "p1",
            stockBatchId: "b1",
            saleId: "s1",
            quantity: new Prisma.Decimal(2),
            costUnit: new Prisma.Decimal(5),
            obs: "Sale cancellation",
            createdUserId: "user1",
        },
    });
});

// ---- reports.service (debts / receiveDebtorPayment / debtorStatement) ----

test("reports debts groups sales by debtor and sorts by the most recent activity", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
        {
            id: "s1",
            debtorId: "d1",
            debtor: { id: "d1", name: "Ana" },
            clientName: null,
            total: new Prisma.Decimal(50),
            createdAt: new Date("2026-01-01"),
            payments: [{ id: "p1", amount: new Prisma.Decimal(10), method: "CASH", paidAt: new Date("2026-01-01") }],
        },
        {
            id: "s2",
            debtorId: "d1",
            debtor: { id: "d1", name: "Ana" },
            clientName: null,
            total: new Prisma.Decimal(30),
            createdAt: new Date("2026-01-05"),
            payments: [],
        },
        {
            id: "s3",
            debtorId: null,
            debtor: null,
            clientName: "Balcao",
            total: new Prisma.Decimal(20),
            createdAt: new Date("2026-01-03"),
            payments: [],
        },
    ]);
    const result = await reportsService.debts(1, 20);
    expect(result.total).toBe(2);
    expect(result.data[0]).toMatchObject({ id: "d1", total: new Prisma.Decimal(80), salesCount: 2 });
    expect(result.data[1]).toMatchObject({ id: "sale:s3", clientName: "Balcao", salesCount: 1 });
});

test("reports receiveDebtorPayment throws 404 when there is no outstanding debt", async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    await expect(reportsService.receiveDebtorPayment("d1", 10, "CASH", undefined, "user1")).rejects.toMatchObject({
        statusCode: 404,
    });
});

test("reports receiveDebtorPayment rejects a payment that exceeds the total debt", async () => {
    prismaMock.sale.findMany.mockResolvedValue([{ id: "s1", total: new Prisma.Decimal(50), payments: [] }]);
    await expect(reportsService.receiveDebtorPayment("d1", 100, "CASH", undefined, "user1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Payment exceeds total debt",
    });
});

test("reports receiveDebtorPayment settles balances FIFO across multiple sales", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
        { id: "s1", total: new Prisma.Decimal(30), payments: [] },
        { id: "s2", total: new Prisma.Decimal(50), payments: [] },
    ]);
    prismaMock.payment.create.mockImplementation(async ({ data }: { data: { saleId: string } }) => ({
        ...data,
        id: `pay-${data.saleId}`,
    }));
    prismaMock.sale.update.mockResolvedValue({});
    const payments = await reportsService.receiveDebtorPayment("d1", 40, "CASH", undefined, "user1");
    expect(payments).toHaveLength(2);
    expect(prismaMock.sale.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.sale.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "PAID" } });
});

test("reports debtorStatement throws 404 when the debtor is missing", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue(null);
    await expect(reportsService.debtorStatement("missing")).rejects.toMatchObject({ statusCode: 404 });
});

test("reports debtorStatement returns the debtor with their non-canceled sales", async () => {
    prismaMock.debtor.findUnique.mockResolvedValue({ id: "d1", name: "Ana" });
    prismaMock.sale.findMany.mockResolvedValue([{ id: "s1" }]);
    const result = await reportsService.debtorStatement("d1");
    expect(result).toEqual({ debtor: { id: "d1", name: "Ana" }, sales: [{ id: "s1" }] });
});

// ---- expenses.service (list / create / delete) ----

test("expenses list returns empty when the search finds no matches", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    const result = await expensesService.list({ search: "nobody", skip: 0, take: 20 });
    expect(result).toEqual({ data: [], total: 0 });
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
});

test("expenses list paginates with the given filters", async () => {
    prismaMock.expense.findMany.mockResolvedValue([{ id: "e1" }]);
    prismaMock.expense.count.mockResolvedValue(1);
    const result = await expensesService.list({ status: "PENDING", skip: 0, take: 20 });
    expect(result).toEqual({ data: [{ id: "e1" }], total: 1 });
});

test("expenses create persists the expense with its creator", async () => {
    prismaMock.expense.create.mockResolvedValue({ id: "e1" });
    const result = await expensesService.create({ name: "Aluguel", value: 100, dueDate: new Date() }, "user1");
    expect(result).toEqual({ id: "e1" });
    expect(prismaMock.expense.create.mock.calls[0][0].data).toMatchObject({
        name: "Aluguel",
        createdUserId: "user1",
    });
});

test("expenses delete throws 404 when the expense is missing", async () => {
    prismaMock.expense.findUnique.mockResolvedValue(null);
    await expect(expensesService.delete("missing")).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.expense.delete).not.toHaveBeenCalled();
});

test("expenses delete removes the expense and its pending notifications", async () => {
    prismaMock.expense.findUnique.mockResolvedValue({ id: "e1" });
    prismaMock.expense.delete.mockResolvedValue({});
    await expensesService.delete("e1");
    expect(prismaMock.expense.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { entityType: "expense", entityId: "e1" },
    });
});

// ---- cash-movements.service (list / create) ----

test("cash movements list paginates with the given filters", async () => {
    prismaMock.cashMovement.findMany.mockResolvedValue([{ id: "cm1" }]);
    prismaMock.cashMovement.count.mockResolvedValue(1);
    const result = await cashMovementsService.list({ type: "DEPOSIT", skip: 0, take: 20 });
    expect(result).toEqual({ data: [{ id: "cm1" }], total: 1 });
    expect(prismaMock.cashMovement.findMany.mock.calls[0][0].where).toEqual({ type: "DEPOSIT" });
});

test("cash movements create persists the movement with its creator", async () => {
    prismaMock.cashMovement.create.mockResolvedValue({ id: "cm1" });
    const result = await cashMovementsService.create({ type: "DEPOSIT", value: 50 }, "user1");
    expect(result).toEqual({ id: "cm1" });
    expect(prismaMock.cashMovement.create).toHaveBeenCalledWith({
        data: { type: "DEPOSIT", value: 50, createdUserId: "user1" },
    });
});

// ---- notifications.service (delete) ----

test("notifications delete throws 404 when the notification is missing", async () => {
    prismaMock.notification.findUnique.mockResolvedValue(null);
    await expect(notificationsService.delete("missing")).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.notification.delete).not.toHaveBeenCalled();
});

test("notifications delete removes the notification", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({ id: "n1" });
    prismaMock.notification.delete.mockResolvedValue({});
    await notificationsService.delete("n1");
    expect(prismaMock.notification.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
});
