import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { dateRangeFilter } from "../../lib/date-range.js";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { cashMovementParamsSchema, cashMovementSchema, cashMovementsListSchema } from "./cash-movements.schemas.js";
import { cashMovementsService } from "./cash-movements.service.js";

const invalidateCashMovements = async () => {
    await invalidate("dashboard");
    await invalidatePrefix("reports:");
    await invalidatePrefix("cash-movements:");
};

export const cashMovementsController = {
    list: async (request: FastifyRequest) => {
        const query = parse(cashMovementsListSchema, request.query);
        const createdAt = dateRangeFilter(query.dateFrom, query.dateTo);
        const result = await cashMovementsService.list({
            type: query.type,
            createdAt,
            skip: getSkip(query),
            take: query.limit,
        });
        return paginate(result.data, result.total, query);
    },
    balance: async () => cashMovementsService.balance(),
    create: async (request: FastifyRequest, reply: FastifyReply) => {
        const movement = await cashMovementsService.create(parse(cashMovementSchema, request.body), request.user.sub);
        await invalidateCashMovements();
        return reply.status(201).send(movement);
    },
    delete: async (request: FastifyRequest, reply: FastifyReply) => {
        await cashMovementsService.delete(parse(cashMovementParamsSchema, request.params).id);
        await invalidateCashMovements();
        return reply.status(204).send();
    },
};
