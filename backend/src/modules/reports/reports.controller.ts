import type { FastifyReply, FastifyRequest } from "fastify";
import { invalidate, invalidatePrefix } from "../../lib/cache.js";
import { dateRangeFilter } from "../../lib/date-range.js";
import { parse } from "../../lib/errors.js";
import { paginate } from "../../lib/pagination.js";
import {
    dashboardReportQuerySchema,
    debtorStatementParamsSchema,
    debtsReportQuerySchema,
    receiveDebtPaymentSchema,
} from "./reports.schemas.js";
import { reportsService } from "./reports.service.js";

export const reportsController = {
    dashboard: async (request: FastifyRequest) =>
        reportsService.dashboard(parse(dashboardReportQuerySchema, request.query)),
    debts: async (request: FastifyRequest) => {
        const query = parse(debtsReportQuerySchema, request.query);
        const createdAt = dateRangeFilter(query.dateFrom, query.dateTo);
        const result = await reportsService.debts(query.page, query.limit, createdAt, query.debtorId);
        return paginate(result.data, result.total, query);
    },
    debtorStatement: async (request: FastifyRequest) => {
        const { debtorId } = parse(debtorStatementParamsSchema, request.params);
        return reportsService.debtorStatement(debtorId);
    },
    receiveDebtorPayment: async (request: FastifyRequest, reply: FastifyReply) => {
        const { debtorId } = parse(debtorStatementParamsSchema, request.params);
        const input = parse(receiveDebtPaymentSchema, request.body);
        const payments = await reportsService.receiveDebtorPayment(
            debtorId,
            input.amount,
            input.method,
            input.obs,
            request.user.sub,
        );
        await invalidatePrefix("reports:");
        await invalidatePrefix("sales:list:");
        await invalidate("dashboard");
        return reply.status(201).send(payments);
    },
};
