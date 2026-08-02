import { Prisma } from "@prisma/client";
import { getOrSetLocal } from "../../lib/cache.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { SaleInput } from "./sales.schemas.js";

const decimal = (value: number) => new Prisma.Decimal(value);
type Allocation = {
    productId: string;
    stockBatchId: string;
    quantity: Prisma.Decimal;
    priceUnit: Prisma.Decimal;
    costUnit: Prisma.Decimal;
};

function resolveSalePrice(product: { name: string; priceSell: Prisma.Decimal | null }, priceUnit?: number) {
    if (priceUnit) return decimal(priceUnit);
    if (!product.priceSell) throw new AppError(409, `${product.name} has no default sale price defined`);
    return product.priceSell;
}

async function allocateItems(tx: Prisma.TransactionClient, input: SaleInput) {
    const allocations: Allocation[] = [];
    let total = new Prisma.Decimal(0);
    for (const item of input.items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, status: "ACTIVE" } });
        if (!product) throw new AppError(404, "Product not found");
        if (product.type === "RAW_MATERIAL")
            throw new AppError(409, `${product.name} is a raw material and cannot be sold directly`);
        let remaining = decimal(item.quantity);
        const priceUnit = resolveSalePrice(product, item.priceUnit);
        const batches = await tx.stockBatch.findMany({
            where: { productId: product.id, status: "ACTIVE", quantityLeft: { gt: 0 } },
            orderBy: [{ dateBuy: "asc" }, { id: "asc" }],
        });
        for (const batch of batches) {
            if (remaining.isZero()) break;
            const quantity = Prisma.Decimal.min(remaining, batch.quantityLeft);
            allocations.push({
                productId: product.id,
                stockBatchId: batch.id,
                quantity,
                priceUnit,
                costUnit: batch.priceBuy,
            });
            remaining = remaining.minus(quantity);
            total = total.add(quantity.mul(priceUnit));
        }
        if (!remaining.isZero()) throw new AppError(409, `Insufficient stock for ${product.name}`);
    }
    return { allocations, total };
}

async function persistAllocations(
    tx: Prisma.TransactionClient,
    saleId: string,
    allocations: Allocation[],
    userId: string,
) {
    for (const allocation of allocations) {
        await tx.stockBatch.update({
            where: { id: allocation.stockBatchId },
            data: { quantityLeft: { decrement: allocation.quantity } },
        });
        await tx.saleItem.create({
            data: {
                saleId,
                productId: allocation.productId,
                stockBatchId: allocation.stockBatchId,
                quantity: allocation.quantity,
                priceUnit: allocation.priceUnit,
                priceTotal: allocation.quantity.mul(allocation.priceUnit),
                createdUserId: userId,
            },
        });
        await tx.stockMovement.create({
            data: {
                type: "OUT",
                productId: allocation.productId,
                stockBatchId: allocation.stockBatchId,
                saleId,
                quantity: allocation.quantity,
                costUnit: allocation.costUnit,
                createdUserId: userId,
            },
        });
    }
}

export const salesService = {
    create: async (input: SaleInput, userId: string) => {
        return prisma.$transaction(
            async (tx) => {
                const { allocations, total } = await allocateItems(tx, input);
                const sale = await tx.sale.create({
                    data: {
                        clientName: input.clientName,
                        status: input.status,
                        debtorId: input.debtorId ?? null,
                        total,
                        obs: input.obs,
                        createdUserId: userId,
                    },
                });
                await persistAllocations(tx, sale.id, allocations, userId);
                if (input.status === "PAID" && input.paymentMethod)
                    await tx.payment.create({
                        data: { saleId: sale.id, amount: total, method: input.paymentMethod, createdUserId: userId },
                    });
                return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true, payments: true } });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    },
    update: async (saleId: string, input: SaleInput, userId: string) =>
        prisma.$transaction(
            async (tx) => {
                const current = await tx.sale.findUnique({
                    where: { id: saleId },
                    include: { items: true, payments: true },
                });
                if (!current) throw new AppError(404, "Sale not found");
                if (current.status === "CANCELED") throw new AppError(409, "Canceled sale cannot be edited");
                for (const item of current.items)
                    await tx.stockBatch.update({
                        where: { id: item.stockBatchId },
                        data: { quantityLeft: { increment: item.quantity } },
                    });
                await tx.stockMovement.deleteMany({ where: { saleId } });
                await tx.saleItem.deleteMany({ where: { saleId } });
                await tx.payment.deleteMany({ where: { saleId } });
                const { allocations, total } = await allocateItems(tx, input);
                await tx.sale.update({
                    where: { id: saleId },
                    data: {
                        clientName: input.clientName,
                        status: input.status,
                        debtorId: input.debtorId ?? null,
                        total,
                        obs: input.obs,
                    },
                });
                await persistAllocations(tx, saleId, allocations, userId);
                if (input.status === "PAID" && input.paymentMethod)
                    await tx.payment.create({
                        data: { saleId, amount: total, method: input.paymentMethod, createdUserId: userId },
                    });
                return tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true, payments: true } });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
    delete: async (saleId: string) =>
        prisma.$transaction(
            async (tx) => {
                const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
                if (!sale) throw new AppError(404, "Sale not found");
                if (sale.status !== "CANCELED")
                    for (const item of sale.items)
                        await tx.stockBatch.update({
                            where: { id: item.stockBatchId },
                            data: { quantityLeft: { increment: item.quantity } },
                        });
                await tx.sale.delete({ where: { id: saleId } });
                return sale;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
    list: async (where: Prisma.SaleWhereInput, skip: number, take: number) => {
        const key = `sales:list:${JSON.stringify({ where, skip, take })}`;
        return getOrSetLocal(key, 30, async () => {
            const [data, total] = await Promise.all([
                prisma.sale.findMany({
                    where,
                    include: { debtor: true, items: true, payments: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    skip,
                    take,
                }),
                prisma.sale.count({ where }),
            ]);
            return { data, total };
        });
    },
    get: async (id: string) => {
        return getOrSetLocal(`sales:id:${id}`, 30, async () => {
            const sale = await prisma.sale.findUnique({
                where: { id },
                include: {
                    debtor: true,
                    items: { include: { product: true, stockBatch: true } },
                    payments: true,
                    movements: true,
                },
            });
            if (!sale) throw new AppError(404, "Sale not found");
            return sale;
        });
    },
    addPayment: async (
        saleId: string,
        amount: number,
        method: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER",
        obs: string | undefined,
        userId: string,
    ) =>
        prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { payments: true } });
            if (!sale) throw new AppError(404, "Sale not found");
            if (sale.status === "CANCELED" || sale.status === "FREE")
                throw new AppError(409, "Sale cannot receive payments");
            const paid = sale.payments.reduce((total, payment) => total.add(payment.amount), new Prisma.Decimal(0));
            if (paid.add(amount).greaterThan(sale.total)) throw new AppError(409, "Payment exceeds sale total");
            const payment = await tx.payment.create({ data: { saleId, amount, method, obs, createdUserId: userId } });
            if (paid.add(amount).equals(sale.total))
                await tx.sale.update({ where: { id: saleId }, data: { status: "PAID" } });
            return payment;
        }),
    cancel: async (saleId: string, userId: string) =>
        prisma.$transaction(
            async (tx) => {
                const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
                if (!sale) throw new AppError(404, "Sale not found");
                if (sale.status === "CANCELED") throw new AppError(409, "Sale already canceled");
                for (const item of sale.items) {
                    const batch = await tx.stockBatch.update({
                        where: { id: item.stockBatchId },
                        data: { quantityLeft: { increment: item.quantity } },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: "REVERSAL",
                            productId: item.productId,
                            stockBatchId: item.stockBatchId,
                            saleId,
                            quantity: item.quantity,
                            costUnit: batch.priceBuy,
                            obs: "Sale cancellation",
                            createdUserId: userId,
                        },
                    });
                }
                return tx.sale.update({
                    where: { id: saleId },
                    data: { status: "CANCELED" },
                    include: { items: true },
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
};
