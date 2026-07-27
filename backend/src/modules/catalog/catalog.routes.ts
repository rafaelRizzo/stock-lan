import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { createCatalogController } from "./catalog.controller.js";
import { catalogResources } from "./catalog.schemas.js";

export async function registerCatalogRoutes(
    app: FastifyInstance,
) {
    for (const resource of catalogResources) {
        const controller =
            createCatalogController(resource);
        app.get(
            `/${resource.path}`,
            {
                preHandler: requireRole(
                    "ADMIN",
                    "MANAGER",
                    "OPERATOR",
                ),
                schema: { tags: [resource.path] },
            },
            controller.list,
        );
        app.get(
            `/${resource.path}/:id`,
            {
                preHandler: requireRole(
                    "ADMIN",
                    "MANAGER",
                    "OPERATOR",
                ),
                schema: { tags: [resource.path] },
            },
            controller.get,
        );
        app.post(
            `/${resource.path}`,
            {
                preHandler: requireRole("ADMIN", "MANAGER"),
                schema: { tags: [resource.path] },
            },
            controller.create,
        );
        app.patch(
            `/${resource.path}/:id`,
            {
                preHandler: requireRole("ADMIN", "MANAGER"),
                schema: { tags: [resource.path] },
            },
            controller.update,
        );
        app.delete(
            `/${resource.path}/:id/permanent`,
            {
                preHandler: requireRole("ADMIN"),
                schema: { tags: [resource.path] },
            },
            controller.permanentDelete,
        );
        app.delete(
            `/${resource.path}/:id`,
            {
                preHandler: requireRole("ADMIN"),
                schema: { tags: [resource.path] },
            },
            controller.archive,
        );
    }
}
