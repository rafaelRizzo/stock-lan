import type { FastifyInstance } from "fastify";
import {
    authenticate,
    requireRole,
} from "../../middlewares/auth.middleware.js";
import { salesController } from "./sales.controller.js";

export async function registerSalesRoutes(
    app: FastifyInstance,
) {
    app.post(
        "/sales",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["sales"] },
        },
        salesController.create,
    );
    app.get(
        "/sales",
        {
            preHandler: authenticate,
            schema: { tags: ["sales"] },
        },
        salesController.list,
    );
    app.get(
        "/sales/:id",
        {
            preHandler: authenticate,
            schema: { tags: ["sales"] },
        },
        salesController.get,
    );
    app.patch(
        "/sales/:id",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["sales"] },
        },
        salesController.update,
    );
    app.delete(
        "/sales/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["sales"] },
        },
        salesController.delete,
    );
    app.post(
        "/sales/:id/payments",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["sales"] },
        },
        salesController.addPayment,
    );
    app.post(
        "/sales/:id/cancel",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["sales"] },
        },
        salesController.cancel,
    );
}
