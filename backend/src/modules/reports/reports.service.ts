import { Prisma } from "@prisma/client";
import { getOrSetLocal } from "../../lib/cache.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const cashFlowDays = 10;

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

type DashboardPeriod = {
    startDate?: Date;
    endDate?: Date;
};

const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
};

const getCashFlowPeriod = (period: DashboardPeriod) => {
    if (period.startDate && period.endDate) {
        const start = startOfDay(period.startDate);
        const end = startOfDay(period.endDate);
        end.setUTCDate(end.getUTCDate() + 1);
        const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
        return { start, end, days };
    }
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (cashFlowDays - 1));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + cashFlowDays);
    return { start, end, days: cashFlowDays };
};

export const reportsService = {
    dashboard: async (period: DashboardPeriod = {}) => {
        const { start, end, days } = getCashFlowPeriod(period);
        const range = { gte: start, lt: end };
        const metricRange = period.startDate && period.endDate ? range : undefined;
        const replenishmentWhere = metricRange
            ? Prisma.sql`WHERE "dateBuy" >= ${start} AND "dateBuy" < ${end}`
            : Prisma.empty;
        const cacheKey = `reports:dashboard:${start.toISOString()}:${end.toISOString()}`;
        return getOrSetLocal(cacheKey, 30, async () => {
            const [
                paidSales,
                receivables,
                paidExpenses,
                lowStock,
                payments,
                cashExpenses,
                stockBatches,
                replenishment,
                cashMovements,
            ] = await Promise.all([
                prisma.sale.aggregate({
                    where: { status: "PAID", ...(metricRange ? { createdAt: metricRange } : {}) },
                    _sum: { total: true },
                }),
                prisma.sale.aggregate({
                    where: {
                        status: { in: ["PENDING", "DEBT"] },
                        ...(metricRange ? { createdAt: metricRange } : {}),
                    },
                    _sum: { total: true },
                }),
                prisma.expense.aggregate({
                    where: { status: "PAID", ...(metricRange ? { paidAt: metricRange } : {}) },
                    _sum: { value: true },
                }),
                prisma.stockBatch.count({
                    where: {
                        status: "ACTIVE",
                        notifyLimit: true,
                        quantityNotify: { not: null },
                    },
                }),
                prisma.payment.findMany({
                    where: { paidAt: range },
                    select: { amount: true, paidAt: true },
                }),
                prisma.expense.findMany({
                    where: { status: "PAID", paidAt: range },
                    select: { value: true, paidAt: true },
                }),
                prisma.stockBatch.findMany({
                    where: { dateBuy: range },
                    select: { dateBuy: true, priceBuy: true, quantityIn: true },
                }),
                prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
                    SELECT COALESCE(SUM("quantityIn" * "priceBuy"), 0) AS "total"
                    FROM "StockBatch"
                    ${replenishmentWhere}
                `,
                prisma.cashMovement.findMany({
                    where: { createdAt: range },
                    select: { type: true, value: true, createdAt: true },
                }),
            ]);
            const revenue = paidSales._sum.total ?? new Prisma.Decimal(0);
            const expenses = paidExpenses._sum.value ?? new Prisma.Decimal(0);
            const stockReplenishment = replenishment[0]?.total ?? new Prisma.Decimal(0);
            const cashFlow = Array.from({ length: days }, (_, index) => {
                const date = new Date(start);
                date.setUTCDate(date.getUTCDate() + index);
                return { date: dayKey(date), income: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) };
            });
            const points = new Map(cashFlow.map((point) => [point.date, point]));
            for (const payment of payments) {
                const point = points.get(dayKey(payment.paidAt));
                if (point) point.income = point.income.add(payment.amount);
            }
            for (const expense of cashExpenses) {
                if (!expense.paidAt) continue;
                const point = points.get(dayKey(expense.paidAt));
                if (point) point.expense = point.expense.add(expense.value);
            }
            for (const batch of stockBatches) {
                const point = points.get(dayKey(batch.dateBuy));
                if (point) point.expense = point.expense.add(batch.quantityIn.mul(batch.priceBuy));
            }
            for (const movement of cashMovements) {
                const point = points.get(dayKey(movement.createdAt));
                if (!point) continue;
                if (movement.type === "DEPOSIT") point.income = point.income.add(movement.value);
                else point.expense = point.expense.add(movement.value);
            }
            return {
                revenue,
                receivables: receivables._sum.total ?? new Prisma.Decimal(0),
                expenses,
                profit: revenue.sub(expenses),
                lowStock,
                stockReplenishment,
                cashFlow,
            };
        });
    },

    debts: async (page: number, limit: number, createdAt?: Prisma.DateTimeFilter, debtorId?: string) =>
        getOrSetLocal(
            `reports:debts:${page}:${limit}:${debtorId ?? ""}:${JSON.stringify(createdAt ?? null)}`,
            30,
            async () => {
                const where = {
                    status: "DEBT" as const,
                    ...(createdAt ? { createdAt } : {}),
                    ...(debtorId ? { debtorId } : {}),
                };
                const sales = await prisma.sale.findMany({
                    where,
                    include: { debtor: true, payments: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                });
                const groups = new Map<
                    string,
                    {
                        id: string;
                        debtor: { id: string; name: string } | null;
                        clientName: string | null;
                        total: Prisma.Decimal;
                        salesCount: number;
                        latestCreatedAt: Date;
                        payments: Array<{ id: string; amount: Prisma.Decimal; method: string; paidAt: Date }>;
                    }
                >();
                for (const sale of sales) {
                    const key = sale.debtorId ?? `sale:${sale.id}`;
                    const group = groups.get(key) ?? {
                        id: key,
                        debtor: sale.debtor ? { id: sale.debtor.id, name: sale.debtor.name } : null,
                        clientName: sale.clientName,
                        total: new Prisma.Decimal(0),
                        salesCount: 0,
                        latestCreatedAt: sale.createdAt,
                        payments: [],
                    };
                    group.total = group.total.add(sale.total);
                    group.salesCount += 1;
                    group.payments.push(...sale.payments);
                    if (sale.createdAt > group.latestCreatedAt) group.latestCreatedAt = sale.createdAt;
                    groups.set(key, group);
                }
                const all = Array.from(groups.values()).sort(
                    (a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime(),
                );
                const total = all.length;
                const data = all.slice((page - 1) * limit, (page - 1) * limit + limit);
                return { data, total };
            },
        ),

    receiveDebtorPayment: async (
        debtorId: string,
        amount: number,
        method: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER",
        obs: string | undefined,
        userId: string,
    ) =>
        prisma.$transaction(async (tx) => {
            const sales = await tx.sale.findMany({
                where: { debtorId, status: "DEBT" },
                include: { payments: true },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            });
            if (sales.length === 0) throw new AppError(404, "No outstanding debt for this debtor");
            const balances = sales.map((sale) => {
                const paid = sale.payments.reduce((total, payment) => total.add(payment.amount), new Prisma.Decimal(0));
                return { sale, balance: sale.total.sub(paid) };
            });
            const totalBalance = balances.reduce((total, entry) => total.add(entry.balance), new Prisma.Decimal(0));
            let remaining = new Prisma.Decimal(amount);
            if (remaining.greaterThan(totalBalance)) throw new AppError(409, "Payment exceeds total debt");
            const paidAt = new Date();
            const payments = [];
            for (const { sale, balance } of balances) {
                if (remaining.lessThanOrEqualTo(0)) break;
                if (balance.lessThanOrEqualTo(0)) continue;
                const take = Prisma.Decimal.min(balance, remaining);
                const payment = await tx.payment.create({
                    data: { saleId: sale.id, amount: take, method, obs, paidAt, createdUserId: userId },
                });
                if (take.equals(balance)) await tx.sale.update({ where: { id: sale.id }, data: { status: "PAID" } });
                remaining = remaining.sub(take);
                payments.push(payment);
            }
            return payments;
        }),

    debtorStatement: async (debtorId: string) =>
        getOrSetLocal(`reports:debtor-statement:${debtorId}`, 30, async () => {
            const debtor = await prisma.debtor.findUnique({ where: { id: debtorId } });
            if (!debtor) throw new AppError(404, "Debtor not found");
            const sales = await prisma.sale.findMany({
                where: { debtorId, status: { not: "CANCELED" } },
                include: {
                    payments: { orderBy: { paidAt: "asc" } },
                    items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            });
            return { debtor, sales };
        }),
};
