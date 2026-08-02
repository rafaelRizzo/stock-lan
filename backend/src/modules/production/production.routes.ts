import type { FastifyInstance } from "fastify";
import {
    authenticate,
    requireRole,
} from "../../middlewares/auth.middleware.js";
import { productionController } from "./production.controller.js";

export async function registerProductionRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/production/recipes/:productId",
        {
            preHandler: authenticate,
            schema: { tags: ["production"] },
        },
        productionController.getRecipe,
    );
    app.patch(
        "/production/recipes/:productId",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["production"] },
        },
        productionController.replaceRecipe,
    );
    app.post(
        "/production/orders",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["production"] },
        },
        productionController.create,
    );
    app.get(
        "/production/orders",
        {
            preHandler: authenticate,
            schema: { tags: ["production"] },
        },
        productionController.list,
    );
    app.get(
        "/production/orders/:id",
        {
            preHandler: authenticate,
            schema: { tags: ["production"] },
        },
        productionController.get,
    );
    app.patch(
        "/production/orders/:id",
        {
            preHandler: requireRole(
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ),
            schema: { tags: ["production"] },
        },
        productionController.update,
    );
    app.post(
        "/production/orders/:id/cancel",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["production"] },
        },
        productionController.cancel,
    );
}
