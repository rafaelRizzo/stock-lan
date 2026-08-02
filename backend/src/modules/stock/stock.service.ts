import { Prisma } from "@prisma/client";
import { getOrSetLocal } from "../../lib/cache.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export async function createNoCostStockBatch(
    tx: Prisma.TransactionClient,
    input: { productId: string; quantityTypeId: string; quantity: number; obs?: string },
    userId: string,
) {
    const batch = await tx.stockBatch.create({
        data: {
            productId: input.productId,
            quantityTypeId: input.quantityTypeId,
            quantityIn: input.quantity,
            quantityLeft: input.quantity,
            priceBuy: 0,
            dateBuy: new Date(),
            obs: input.obs,
            createdUserId: userId,
        },
    });
    await tx.stockMovement.create({
        data: {
            type: "IN",
            productId: batch.productId,
            stockBatchId: batch.id,
            quantity: input.quantity,
            costUnit: 0,
            createdUserId: userId,
        },
    });
    return batch;
}

export const stockService = {
    addNoCostStock: async (
        input: { productId: string; quantityTypeId: string; quantity: number; obs?: string },
        userId: string,
    ) => prisma.$transaction((tx) => createNoCostStockBatch(tx, input, userId)),

    createBatch: async (
        input: {
            supplierId: string;
            productId: string;
            quantityTypeId: string;
            quantityIn: number;
            priceBuy: number;
            dateBuy: Date;
            notifyLimit: boolean;
            quantityNotify?: number;
            obs?: string;
        },
        userId: string,
    ) => {
        return prisma.$transaction(async (tx) => {
            const batch = await tx.stockBatch.create({
                data: { ...input, quantityLeft: input.quantityIn, createdUserId: userId },
            });
            await tx.stockMovement.create({
                data: {
                    type: "IN",
                    productId: batch.productId,
                    stockBatchId: batch.id,
                    quantity: input.quantityIn,
                    costUnit: input.priceBuy,
                    createdUserId: userId,
                },
            });
            return batch;
        });
    },

    updateBatch: async (
        id: string,
        input: {
            supplierId: string;
            productId: string;
            quantityTypeId: string;
            quantityIn: number;
            priceBuy: number;
            dateBuy: Date;
            notifyLimit: boolean;
            quantityNotify?: number;
            obs?: string;
        },
    ) =>
        prisma.$transaction(async (tx) => {
            const current = await tx.stockBatch.findUnique({
                where: { id },
                include: { saleItems: { select: { id: true } }, movements: { select: { type: true } } },
            });
            if (!current) throw new AppError(404, "Stock batch not found");
            if (current.saleItems.length || current.movements.some((movement) => movement.type !== "IN"))
                throw new AppError(409, "Stock batch cannot be edited after stock movements");
            const batch = await tx.stockBatch.update({
                where: { id },
                data: { ...input, quantityLeft: input.quantityIn },
            });
            await tx.stockMovement.updateMany({
                where: { stockBatchId: id, type: "IN" },
                data: { productId: input.productId, quantity: input.quantityIn, costUnit: input.priceBuy },
            });
            return { batch, previousProductId: current.productId };
        }),

    deleteBatch: async (id: string) =>
        prisma.$transaction(async (tx) => {
            const current = await tx.stockBatch.findUnique({
                where: { id },
                include: { saleItems: { select: { id: true } }, movements: { select: { type: true } } },
            });
            if (!current) throw new AppError(404, "Stock batch not found");
            if (current.saleItems.length || current.movements.some((movement) => movement.type !== "IN"))
                throw new AppError(409, "Stock batch cannot be deleted after stock movements");
            await tx.stockBatch.delete({ where: { id } });
            return current;
        }),

    getProductStock: async (productId: string) =>
        getOrSetLocal(`stock:product:${productId}`, 15, async () => {
            const [product, batches, aggregate] = await Promise.all([
                prisma.product.findUnique({ where: { id: productId } }),
                prisma.stockBatch.findMany({
                    where: { productId, status: "ACTIVE" },
                    orderBy: [{ dateBuy: "asc" }, { id: "asc" }],
                }),
                prisma.stockBatch.aggregate({ where: { productId, status: "ACTIVE" }, _sum: { quantityLeft: true } }),
            ]);
            if (!product) throw new AppError(404, "Product not found");
            return { product, available: aggregate._sum.quantityLeft ?? new Prisma.Decimal(0), batches };
        }),

    adjustBatch: async (stockBatchId: string, quantity: number, obs: string, userId: string) => {
        return prisma.$transaction(
            async (tx) => {
                const current = await tx.stockBatch.findUnique({ where: { id: stockBatchId } });
                if (current?.status !== "ACTIVE") throw new AppError(404, "Stock batch not found");
                const next = current.quantityLeft.add(quantity);
                if (next.isNegative()) throw new AppError(409, "Insufficient stock");
                const batch = await tx.stockBatch.update({ where: { id: current.id }, data: { quantityLeft: next } });
                await tx.stockMovement.create({
                    data: {
                        type: "ADJUSTMENT",
                        productId: current.productId,
                        stockBatchId: current.id,
                        quantity,
                        costUnit: current.priceBuy,
                        obs,
                        createdUserId: userId,
                    },
                });
                return batch;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    },

    getBatch: async (id: string) =>
        getOrSetLocal(`stock:batch:${id}`, 30, async () => {
            const batch = await prisma.stockBatch.findUnique({
                where: { id },
                include: { product: true, supplier: true, quantityType: true },
            });
            if (!batch) throw new AppError(404, "Stock batch not found");
            return batch;
        }),

    listBatches: async (where: Prisma.StockBatchWhereInput, skip: number, take: number) => {
        const key = `stock:batches:${JSON.stringify({ where, skip, take })}`;
        return getOrSetLocal(key, 15, async () => {
            const [data, total] = await Promise.all([
                prisma.stockBatch.findMany({
                    where,
                    include: { product: true, supplier: true, quantityType: true },
                    orderBy: [{ dateBuy: "desc" }, { id: "desc" }],
                    skip,
                    take,
                }),
                prisma.stockBatch.count({ where }),
            ]);
            return { data, total };
        });
    },

    listAlerts: async (skip: number, take: number) =>
        getOrSetLocal(`stock:alerts:${skip}:${take}`, 15, async () => {
            const batches = await prisma.stockBatch.findMany({
                where: { status: "ACTIVE", notifyLimit: true, quantityNotify: { not: null } },
                include: { product: true, supplier: true },
                orderBy: [{ quantityLeft: "asc" }, { createdAt: "desc" }],
            });
            const alerts = batches.filter(
                (batch) => batch.quantityNotify && batch.quantityLeft.lessThanOrEqualTo(batch.quantityNotify),
            );
            return { data: alerts.slice(skip, skip + take), total: alerts.length };
        }),

    listMovements: async (skip: number, take: number) =>
        getOrSetLocal(`stock:movements:${skip}:${take}`, 15, async () => {
            const [data, total] = await Promise.all([
                prisma.stockMovement.findMany({
                    include: {
                        product: true,
                        stockBatch: true,
                        sale: true,
                        productionOrder: { include: { finishedProduct: true } },
                    },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    skip,
                    take,
                }),
                prisma.stockMovement.count(),
            ]);
            return { data, total };
        }),
};
