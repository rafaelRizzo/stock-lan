import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { dateRangeFilter } from "../../lib/date-range.js";
import { AppError, parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { saleListSchema, saleParamsSchema, salePaymentSchema, saleSchema, saleUpdateSchema } from "./sales.schemas.js";
import { salesService } from "./sales.service.js";

export const salesController = {
    create: async (request: FastifyRequest, reply: FastifyReply) => {
        const input = parse(saleSchema, request.body);
        if (input.status === "DEBT" && !input.debtorId) throw new AppError(400, "debtorId is required for debt sales");
        if (input.status === "PAID" && !input.paymentMethod)
            throw new AppError(400, "paymentMethod is required for paid sales");
        const sale = await salesService.create(input, request.user.sub);
        await invalidatePrefix("sales:list:");
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        await invalidate("dashboard", ...sale.items.map((item) => `stock:product:${item.productId}`));
        return reply.status(201).send(sale);
    },
    update: async (request: FastifyRequest) => {
        const id = parse(saleParamsSchema, request.params).id;
        const input = parse(saleUpdateSchema, request.body);
        if (input.status === "DEBT" && !input.debtorId) throw new AppError(400, "debtorId is required for debt sales");
        if (input.status === "PAID" && !input.paymentMethod)
            throw new AppError(400, "paymentMethod is required for paid sales");
        const sale = await salesService.update(id, input, request.user.sub);
        await invalidatePrefix("sales:list:");
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        await invalidate("dashboard", ...sale.items.map((item) => `stock:product:${item.productId}`));
        return sale;
    },
    delete: async (request: FastifyRequest, reply: FastifyReply) => {
        const sale = await salesService.delete(parse(saleParamsSchema, request.params).id);
        await invalidatePrefix("sales:list:");
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        await invalidate("dashboard", ...sale.items.map((item) => `stock:product:${item.productId}`));
        return reply.status(204).send();
    },
    list: async (request: FastifyRequest) => {
        const query = parse(saleListSchema, request.query);
        const createdAt = dateRangeFilter(query.dateFrom, query.dateTo);
        const result = await salesService.list(
            {
                ...(query.status ? { status: query.status } : {}),
                ...(createdAt ? { createdAt } : {}),
                ...(query.search ? { clientName: { contains: query.search, mode: "insensitive" } } : {}),
            },
            getSkip(query),
            query.limit,
        );
        return paginate(result.data, result.total, query);
    },
    get: (request: FastifyRequest) => salesService.get(parse(saleParamsSchema, request.params).id),
    addPayment: async (request: FastifyRequest, reply: FastifyReply) => {
        const id = parse(saleParamsSchema, request.params).id;
        const input = parse(salePaymentSchema, request.body);
        const payment = await salesService.addPayment(id, input.amount, input.method, input.obs, request.user.sub);
        await invalidate(`sales:id:${id}`, "dashboard");
        await invalidatePrefix("sales:list:");
        await invalidatePrefix("reports:");
        return reply.status(201).send(payment);
    },
    cancel: async (request: FastifyRequest) => {
        const sale = await salesService.cancel(parse(saleParamsSchema, request.params).id, request.user.sub);
        await invalidate(
            `sales:id:${sale.id}`,
            "dashboard",
            ...sale.items.map((item) => `stock:product:${item.productId}`),
        );
        await invalidatePrefix("sales:list:");
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        return sale;
    },
};
