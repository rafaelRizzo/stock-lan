import { Prisma } from "@prisma/client";
import { getOrSetLocal } from "../../lib/cache.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const decimal = (value: number) => new Prisma.Decimal(value);

type ProductionOrderInput = {
    finishedProductId: string;
    quantityTypeId: string;
    quantityProduced: number;
    dateProduced: Date;
    obs?: string;
};

type Consumption = {
    productId: string;
    stockBatchId: string;
    quantity: Prisma.Decimal;
    costUnit: Prisma.Decimal;
};

async function consumeIngredients(
    tx: Prisma.TransactionClient,
    finishedProductId: string,
    quantityProduced: Prisma.Decimal,
) {
    const recipeItems = await tx.recipeItem.findMany({
        where: { finishedProductId },
        include: { rawProduct: true },
    });
    if (!recipeItems.length) throw new AppError(409, "No recipe defined for this product");

    const consumptions: Consumption[] = [];
    let totalCost = new Prisma.Decimal(0);
    for (const item of recipeItems) {
        let remaining = item.quantityPerUnit.mul(quantityProduced);
        const batches = await tx.stockBatch.findMany({
            where: { productId: item.rawProductId, status: "ACTIVE", quantityLeft: { gt: 0 } },
            orderBy: [{ dateBuy: "asc" }, { id: "asc" }],
        });
        for (const batch of batches) {
            if (remaining.isZero()) break;
            const quantity = Prisma.Decimal.min(remaining, batch.quantityLeft);
            consumptions.push({
                productId: item.rawProductId,
                stockBatchId: batch.id,
                quantity,
                costUnit: batch.priceBuy,
            });
            remaining = remaining.minus(quantity);
            totalCost = totalCost.add(quantity.mul(batch.priceBuy));
        }
        if (!remaining.isZero()) throw new AppError(409, `Insufficient stock for ${item.rawProduct.name}`);
    }
    return { consumptions, totalCost };
}

async function persistConsumptions(
    tx: Prisma.TransactionClient,
    consumptions: Consumption[],
    productionOrderId: string,
    userId: string,
) {
    for (const consumption of consumptions) {
        await tx.stockBatch.update({
            where: { id: consumption.stockBatchId },
            data: { quantityLeft: { decrement: consumption.quantity } },
        });
        await tx.stockMovement.create({
            data: {
                type: "OUT",
                productId: consumption.productId,
                stockBatchId: consumption.stockBatchId,
                productionOrderId,
                quantity: consumption.quantity,
                costUnit: consumption.costUnit,
                createdUserId: userId,
            },
        });
    }
}

async function createOutputBatch(
    tx: Prisma.TransactionClient,
    input: ProductionOrderInput,
    costUnit: Prisma.Decimal,
    productionOrderId: string,
    userId: string,
) {
    const batch = await tx.stockBatch.create({
        data: {
            productId: input.finishedProductId,
            quantityTypeId: input.quantityTypeId,
            quantityIn: input.quantityProduced,
            quantityLeft: input.quantityProduced,
            priceBuy: costUnit,
            dateBuy: input.dateProduced,
            productionOrderId,
            createdUserId: userId,
        },
    });
    await tx.stockMovement.create({
        data: {
            type: "IN",
            productId: input.finishedProductId,
            stockBatchId: batch.id,
            productionOrderId,
            quantity: input.quantityProduced,
            costUnit,
            createdUserId: userId,
        },
    });
    return batch;
}

async function runProduction(tx: Prisma.TransactionClient, input: ProductionOrderInput, userId: string) {
    const finishedProduct = await tx.product.findFirst({ where: { id: input.finishedProductId, status: "ACTIVE" } });
    if (!finishedProduct) throw new AppError(404, "Product not found");
    const quantityProduced = decimal(input.quantityProduced);
    const { consumptions, totalCost } = await consumeIngredients(tx, input.finishedProductId, quantityProduced);
    const costUnit = totalCost.div(quantityProduced);
    return { consumptions, quantityProduced, costUnit };
}

const orderInclude = { finishedProduct: true, quantityType: true, outputBatch: true, movements: true } as const;

export const productionService = {
    getRecipe: async (finishedProductId: string) =>
        getOrSetLocal(`production:recipe:${finishedProductId}`, 60, async () =>
            prisma.recipeItem.findMany({
                where: { finishedProductId },
                include: { rawProduct: true },
                orderBy: [{ createdAt: "asc" }],
            }),
        ),

    replaceRecipe: async (
        finishedProductId: string,
        items: Array<{ rawProductId: string; quantityPerUnit: number }>,
        userId: string,
    ) =>
        prisma.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
                where: { id: finishedProductId, status: { not: "ARCHIVED" } },
            });
            if (!product) throw new AppError(404, "Product not found");
            await tx.recipeItem.deleteMany({ where: { finishedProductId } });
            await tx.recipeItem.createMany({
                data: items.map((item) => ({
                    finishedProductId,
                    rawProductId: item.rawProductId,
                    quantityPerUnit: item.quantityPerUnit,
                    createdUserId: userId,
                })),
            });
            return tx.recipeItem.findMany({ where: { finishedProductId }, include: { rawProduct: true } });
        }),

    create: async (input: ProductionOrderInput, userId: string) =>
        prisma.$transaction(
            async (tx) => {
                const { consumptions, quantityProduced, costUnit } = await runProduction(tx, input, userId);
                const order = await tx.productionOrder.create({
                    data: {
                        finishedProductId: input.finishedProductId,
                        quantityTypeId: input.quantityTypeId,
                        quantityProduced,
                        costUnit,
                        dateProduced: input.dateProduced,
                        obs: input.obs,
                        createdUserId: userId,
                    },
                });
                await persistConsumptions(tx, consumptions, order.id, userId);
                await createOutputBatch(tx, input, costUnit, order.id, userId);
                return tx.productionOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),

    update: async (id: string, input: ProductionOrderInput, userId: string) =>
        prisma.$transaction(
            async (tx) => {
                const current = await tx.productionOrder.findUnique({
                    where: { id },
                    include: { outputBatch: { include: { saleItems: { select: { id: true } } } }, movements: true },
                });
                if (!current) throw new AppError(404, "Production order not found");
                if (current.status !== "ACTIVE") throw new AppError(409, "Production order is not active");
                if (current.outputBatch && current.outputBatch.saleItems.length)
                    throw new AppError(409, "Production order cannot be edited after its output has been sold");

                for (const movement of current.movements.filter((movement) => movement.type === "OUT"))
                    await tx.stockBatch.update({
                        where: { id: movement.stockBatchId },
                        data: { quantityLeft: { increment: movement.quantity } },
                    });
                await tx.stockMovement.deleteMany({ where: { productionOrderId: id } });
                if (current.outputBatch) await tx.stockBatch.delete({ where: { id: current.outputBatch.id } });

                const { consumptions, quantityProduced, costUnit } = await runProduction(tx, input, userId);
                const order = await tx.productionOrder.update({
                    where: { id },
                    data: {
                        finishedProductId: input.finishedProductId,
                        quantityTypeId: input.quantityTypeId,
                        quantityProduced,
                        costUnit,
                        dateProduced: input.dateProduced,
                        obs: input.obs,
                    },
                });
                await persistConsumptions(tx, consumptions, order.id, userId);
                await createOutputBatch(tx, input, costUnit, order.id, userId);
                return tx.productionOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),

    cancel: async (id: string, userId: string) =>
        prisma.$transaction(
            async (tx) => {
                const current = await tx.productionOrder.findUnique({
                    where: { id },
                    include: { outputBatch: { include: { saleItems: { select: { id: true } } } }, movements: true },
                });
                if (!current) throw new AppError(404, "Production order not found");
                if (current.status !== "ACTIVE") throw new AppError(409, "Production order already canceled");
                if (current.outputBatch && current.outputBatch.saleItems.length)
                    throw new AppError(409, "Production order cannot be canceled after its output has been sold");

                for (const movement of current.movements.filter((movement) => movement.type === "OUT")) {
                    const batch = await tx.stockBatch.update({
                        where: { id: movement.stockBatchId },
                        data: { quantityLeft: { increment: movement.quantity } },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: "REVERSAL",
                            productId: movement.productId,
                            stockBatchId: movement.stockBatchId,
                            productionOrderId: id,
                            quantity: movement.quantity,
                            costUnit: batch.priceBuy,
                            obs: "Production order cancellation",
                            createdUserId: userId,
                        },
                    });
                }
                if (current.outputBatch)
                    await tx.stockBatch.update({
                        where: { id: current.outputBatch.id },
                        data: { quantityLeft: 0, status: "ARCHIVED" },
                    });
                return tx.productionOrder.update({
                    where: { id },
                    data: { status: "ARCHIVED" },
                    include: orderInclude,
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),

    list: async (where: Prisma.ProductionOrderWhereInput, skip: number, take: number) => {
        const key = `production:orders:${JSON.stringify({ where, skip, take })}`;
        return getOrSetLocal(key, 15, async () => {
            const [data, total] = await Promise.all([
                prisma.productionOrder.findMany({
                    where,
                    include: orderInclude,
                    orderBy: [{ dateProduced: "desc" }, { id: "desc" }],
                    skip,
                    take,
                }),
                prisma.productionOrder.count({ where }),
            ]);
            return { data, total };
        });
    },

    get: async (id: string) =>
        getOrSetLocal(`production:order:${id}`, 30, async () => {
            const order = await prisma.productionOrder.findUnique({ where: { id }, include: orderInclude });
            if (!order) throw new AppError(404, "Production order not found");
            return order;
        }),
};
