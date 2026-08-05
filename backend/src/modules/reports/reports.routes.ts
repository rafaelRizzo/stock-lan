import type { FastifyInstance } from "fastify";
import {
    authenticate,
    requireRole,
} from "../../middlewares/auth.middleware.js";
import { reportsController } from "./reports.controller.js";

export async function registerReportsRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/reports/dashboard",
        {
            preHandler: authenticate,
            schema: { tags: ["reports"] },
        },
        reportsController.dashboard,
    );
    app.get(
        "/reports/debts",
        {
            preHandler: authenticate,
            schema: { tags: ["reports"] },
        },
        reportsController.debts,
    );
    app.get(
        "/reports/debtors/:debtorId/statement",
        {
            preHandler: authenticate,
            schema: { tags: ["reports"] },
        },
        reportsController.debtorStatement,
    );
    app.post(
        "/reports/debtors/:debtorId/receive",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["reports"] },
        },
        reportsController.receiveDebtorPayment,
    );
}
