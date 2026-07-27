import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { expenseParamsSchema, expenseSchema, expensesListSchema } from "./expenses.schemas.js";
import { expensesService } from "./expenses.service.js";

const invalidateExpenses = async () => {
    await invalidate("dashboard");
    await invalidatePrefix("reports:");
};

export const expensesController = {
    list: async (request: FastifyRequest) => {
        const query = parse(expensesListSchema, request.query);
        const result = await expensesService.list({ ...query, skip: getSkip(query), take: query.limit });
        return paginate(result.data, result.total, query);
    },
    create: async (request: FastifyRequest, reply: FastifyReply) => {
        const expense = await expensesService.create(parse(expenseSchema, request.body), request.user.sub);
        await invalidateExpenses();
        return reply.status(201).send(expense);
    },
    update: async (request: FastifyRequest) => {
        const expense = await expensesService.update(
            parse(expenseParamsSchema, request.params).id,
            parse(expenseSchema.partial(), request.body),
        );
        await invalidateExpenses();
        return expense;
    },
    delete: async (request: FastifyRequest, reply: FastifyReply) => {
        await expensesService.delete(parse(expenseParamsSchema, request.params).id);
        await invalidateExpenses();
        return reply.status(204).send();
    },
};
