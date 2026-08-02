import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import {
    productionOrderListSchema,
    productionOrderParamsSchema,
    productionOrderSchema,
    productionOrderUpdateSchema,
    productProductionParamsSchema,
    recipeReplaceSchema,
} from "./production.schemas.js";
import { productionService } from "./production.service.js";

async function invalidateProduction(finishedProductId: string, rawProductIds: string[] = []) {
    await invalidate(
        `stock:product:${finishedProductId}`,
        "dashboard",
        ...rawProductIds.map((id) => `stock:product:${id}`),
    );
    await invalidatePrefix("catalog:product:");
    await invalidatePrefix("stock:");
    await invalidatePrefix("production:");
    await invalidatePrefix("reports:");
}

export const productionController = {
    getRecipe: (request: FastifyRequest) =>
        productionService.getRecipe(parse(productProductionParamsSchema, request.params).productId),

    replaceRecipe: async (request: FastifyRequest) => {
        const productId = parse(productProductionParamsSchema, request.params).productId;
        const input = parse(recipeReplaceSchema, request.body);
        const recipe = await productionService.replaceRecipe(productId, input.items, request.user.sub);
        await invalidatePrefix("production:");
        return recipe;
    },

    create: async (request: FastifyRequest, reply: FastifyReply) => {
        const input = parse(productionOrderSchema, request.body);
        const order = await productionService.create(input, request.user.sub);
        const rawProductIds = order.movements
            .filter((movement) => movement.type === "OUT")
            .map((movement) => movement.productId);
        await invalidateProduction(order.finishedProductId, rawProductIds);
        return reply.status(201).send(order);
    },

    update: async (request: FastifyRequest) => {
        const id = parse(productionOrderParamsSchema, request.params).id;
        const input = parse(productionOrderUpdateSchema, request.body);
        const order = await productionService.update(id, input, request.user.sub);
        const rawProductIds = order.movements
            .filter((movement) => movement.type === "OUT")
            .map((movement) => movement.productId);
        await invalidateProduction(order.finishedProductId, rawProductIds);
        return order;
    },

    cancel: async (request: FastifyRequest) => {
        const id = parse(productionOrderParamsSchema, request.params).id;
        const order = await productionService.cancel(id, request.user.sub);
        const rawProductIds = order.movements
            .filter((movement) => movement.type === "REVERSAL")
            .map((movement) => movement.productId);
        await invalidateProduction(order.finishedProductId, rawProductIds);
        return order;
    },

    list: async (request: FastifyRequest) => {
        const query = parse(productionOrderListSchema, request.query);
        const result = await productionService.list(
            {
                ...(query.status ? { status: query.status } : {}),
                ...(query.search ? { finishedProduct: { name: { contains: query.search, mode: "insensitive" } } } : {}),
            },
            getSkip(query),
            query.limit,
        );
        return paginate(result.data, result.total, query);
    },

    get: (request: FastifyRequest) => productionService.get(parse(productionOrderParamsSchema, request.params).id),
};
