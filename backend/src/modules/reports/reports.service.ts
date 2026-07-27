import { Prisma } from "@prisma/client";
import { getOrSetLocal } from "../../lib/cache.js";
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

    debts: async (page: number, limit: number) =>
        getOrSetLocal(`reports:debts:${page}:${limit}`, 30, async () => {
            const where = { status: "DEBT" as const };
            const [data, total] = await Promise.all([
                prisma.sale.findMany({
                    where,
                    include: { debtor: true, payments: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.sale.count({ where }),
            ]);
            return { data, total };
        }),
};
