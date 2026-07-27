import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { expensesController } from "./expenses.controller.js";

export async function registerExpensesRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/expenses",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["expenses"] },
        },
        expensesController.list,
    );
    app.post(
        "/expenses",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["expenses"] },
        },
        expensesController.create,
    );
    app.patch(
        "/expenses/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["expenses"] },
        },
        expensesController.update,
    );
    app.delete(
        "/expenses/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["expenses"] },
        },
        expensesController.delete,
    );
}
