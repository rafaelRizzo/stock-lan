import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { cashMovementsController } from "./cash-movements.controller.js";

export async function registerCashMovementsRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/cash-movements",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["cash-movements"] },
        },
        cashMovementsController.list,
    );
    app.get(
        "/cash-movements/balance",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["cash-movements"] },
        },
        cashMovementsController.balance,
    );
    app.post(
        "/cash-movements",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["cash-movements"] },
        },
        cashMovementsController.create,
    );
    app.delete(
        "/cash-movements/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["cash-movements"] },
        },
        cashMovementsController.delete,
    );
}
