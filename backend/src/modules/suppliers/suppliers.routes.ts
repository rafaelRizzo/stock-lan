import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { suppliersController } from "./suppliers.controller.js";

export async function registerSuppliersRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/suppliers",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["suppliers"] },
        },
        suppliersController.list,
    );
    app.post(
        "/suppliers",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["suppliers"] },
        },
        suppliersController.create,
    );
    app.patch(
        "/suppliers/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["suppliers"] },
        },
        suppliersController.update,
    );
    app.delete(
        "/suppliers/:id/permanent",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["suppliers"] },
        },
        suppliersController.permanentDelete,
    );
    app.delete(
        "/suppliers/:id",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["suppliers"] },
        },
        suppliersController.archive,
    );
}
