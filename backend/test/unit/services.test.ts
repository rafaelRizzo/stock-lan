import { beforeEach, expect, mock, test } from "bun:test";
import { Prisma } from "@prisma/client";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const prismaMock = {
    sale: { aggregate: mock(), findMany: mock(), count: mock() },
    expense: { aggregate: mock(), findMany: mock() },
    payment: { findMany: mock() },
    stockBatch: {
        count: mock(),
        create: mock(),
        findUnique: mock(),
        findMany: mock(),
        aggregate: mock(),
        update: mock(),
    },
    stockMovement: { create: mock(), findMany: mock(), count: mock() },
    product: { findUnique: mock() },
    user: { findUnique: mock() },
    userSession: { create: mock(), findUnique: mock(), update: mock(), updateMany: mock() },
    $queryRaw: mock(),
    $transaction: mock(async (callback: (client: typeof prismaMock) => unknown) => callback(prismaMock)),
};

mock.module("../../src/lib/prisma.js", () => ({ prisma: prismaMock }));

const { reportsService } = await import("../../src/modules/reports/reports.service.js");
const { stockService } = await import("../../src/modules/stock/stock.service.js");

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
