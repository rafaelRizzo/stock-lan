import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { dateRangeFilter } from "../../lib/date-range.js";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate, paginationSchema } from "../../lib/pagination.js";
import {
    noCostStockSchema,
    stockAdjustmentSchema,
    stockBatchListSchema,
    stockBatchParamsSchema,
    stockBatchSchema,
    stockBatchUpdateSchema,
    stockMovementListSchema,
    stockProductParamsSchema,
} from "./stock.schemas.js";
import { stockService } from "./stock.service.js";

export const stockController = {
    addNoCostStock: async (request: FastifyRequest, reply: FastifyReply) => {
        const input = parse(noCostStockSchema, request.body);
        const batch = await stockService.addNoCostStock(input, request.user.sub);
        await invalidate(`stock:product:${batch.productId}`, "dashboard");
        await invalidatePrefix("catalog:product:");
        await invalidatePrefix("stock:alerts:");
        await invalidatePrefix("stock:movements:");
        await invalidatePrefix("reports:");
        return reply.status(201).send(batch);
    },

    createBatch: async (request: FastifyRequest, reply: FastifyReply) => {
        const input = parse(stockBatchSchema, request.body);
        if (input.notifyLimit && !input.quantityNotify)
            throw new Error("quantityNotify is required when notifyLimit is true");
        const batch = await stockService.createBatch(input, request.user.sub);
        await invalidate(`stock:product:${batch.productId}`, "dashboard");
        await invalidatePrefix("catalog:product:");
        await invalidatePrefix("stock:alerts:");
        await invalidatePrefix("stock:movements:");
        await invalidatePrefix("reports:");
        return reply.status(201).send(batch);
    },

    updateBatch: async (request: FastifyRequest) => {
        const id = parse(stockBatchParamsSchema, request.params).id;
        const input = parse(stockBatchUpdateSchema, request.body);
        if (input.notifyLimit && !input.quantityNotify)
            throw new Error("quantityNotify is required when notifyLimit is true");
        const { batch, previousProductId } = await stockService.updateBatch(id, input);
        await invalidate(
            `stock:batch:${id}`,
            `stock:product:${previousProductId}`,
            `stock:product:${batch.productId}`,
            "dashboard",
        );
        await invalidatePrefix("stock:batches:");
        await invalidatePrefix("catalog:product:");
        await invalidatePrefix("stock:alerts:");
        await invalidatePrefix("stock:movements:");
        await invalidatePrefix("reports:");
        return batch;
    },

    deleteBatch: async (request: FastifyRequest, reply: FastifyReply) => {
        const batch = await stockService.deleteBatch(parse(stockBatchParamsSchema, request.params).id);
        await invalidate(`stock:batch:${batch.id}`, `stock:product:${batch.productId}`, "dashboard");
        await invalidatePrefix("stock:batches:");
        await invalidatePrefix("catalog:product:");
        await invalidatePrefix("stock:alerts:");
        await invalidatePrefix("stock:movements:");
        await invalidatePrefix("reports:");
        return reply.status(204).send();
    },

    getProductStock: (request: FastifyRequest) =>
        stockService.getProductStock(parse(stockProductParamsSchema, request.params).productId),

    adjust: async (request: FastifyRequest) => {
        const input = parse(stockAdjustmentSchema, request.body);
        const batch = await stockService.adjustBatch(input.stockBatchId, input.quantity, input.obs, request.user.sub);
        await invalidate(`stock:product:${batch.productId}`, `stock:batch:${batch.id}`, "dashboard");
        await invalidatePrefix("catalog:product:");
        await invalidatePrefix("stock:alerts:");
        await invalidatePrefix("stock:movements:");
        await invalidatePrefix("reports:");
        return batch;
    },

    getBatch: (request: FastifyRequest) => stockService.getBatch(parse(stockBatchParamsSchema, request.params).id),

    listBatches: async (request: FastifyRequest) => {
        const query = parse(stockBatchListSchema, request.query);
        const dateBuy = dateRangeFilter(query.dateFrom, query.dateTo);
        const searchIds = query.search ? await stockService.searchBatchIds(query.search) : undefined;
        if (searchIds && searchIds.length === 0) return paginate([], 0, query);
        const result = await stockService.listBatches(
            {
                ...(query.status ? { status: query.status } : {}),
                ...(dateBuy ? { dateBuy } : {}),
                ...(searchIds ? { id: { in: searchIds } } : {}),
                ...(query.productId ? { productId: query.productId } : {}),
            },
            getSkip(query),
            query.limit,
        );
        return paginate(result.data, result.total, query);
    },

    listAlerts: async (request: FastifyRequest) => {
        const page = parse(paginationSchema, request.query);
        const result = await stockService.listAlerts(getSkip(page), page.limit);
        return paginate(result.data, result.total, page);
    },

    listMovements: async (request: FastifyRequest) => {
        const query = parse(stockMovementListSchema, request.query);
        const createdAt = dateRangeFilter(query.dateFrom, query.dateTo);
        const result = await stockService.listMovements(createdAt ? { createdAt } : {}, getSkip(query), query.limit);
        return paginate(result.data, result.total, query);
    },
};
