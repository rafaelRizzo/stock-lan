import type { FastifyRequest } from "fastify";
import { parse } from "../../lib/errors.js";
import { paginate } from "../../lib/pagination.js";
import { dashboardReportQuerySchema, debtsReportQuerySchema } from "./reports.schemas.js";
import { reportsService } from "./reports.service.js";

export const reportsController = {
    dashboard: async (request: FastifyRequest) =>
        reportsService.dashboard(parse(dashboardReportQuerySchema, request.query)),
    debts: async (request: FastifyRequest) => {
        const page = parse(debtsReportQuerySchema, request.query);
        const result = await reportsService.debts(page.page, page.limit);
        return paginate(result.data, result.total, page);
    },
};
