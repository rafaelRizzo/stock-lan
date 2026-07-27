import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middlewares/auth.middleware.js";
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
}
