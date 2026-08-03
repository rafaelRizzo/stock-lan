import type { FastifyRequest } from "fastify";
import { dateRangeFilter } from "../../lib/date-range.js";
import { parse } from "../../lib/errors.js";
import { paginate } from "../../lib/pagination.js";
import { dashboardReportQuerySchema, debtsReportQuerySchema } from "./reports.schemas.js";
import { reportsService } from "./reports.service.js";

export const reportsController = {
    dashboard: async (request: FastifyRequest) =>
        reportsService.dashboard(parse(dashboardReportQuerySchema, request.query)),
    debts: async (request: FastifyRequest) => {
        const query = parse(debtsReportQuerySchema, request.query);
        const createdAt = dateRangeFilter(query.dateFrom, query.dateTo);
        const result = await reportsService.debts(query.page, query.limit, createdAt);
        return paginate(result.data, result.total, query);
    },
};
