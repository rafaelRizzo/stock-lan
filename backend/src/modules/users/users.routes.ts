import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { usersController } from "./users.controller.js";

export async function registerUsersRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/users",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["users"] },
        },
        usersController.list,
    );
    app.post(
        "/users",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["users"] },
        },
        usersController.create,
    );
    app.patch(
        "/users/:id",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["users"] },
        },
        usersController.update,
    );
    app.delete(
        "/users/:id",
        {
            preHandler: requireRole("ADMIN"),
            schema: { tags: ["users"] },
        },
        usersController.archive,
    );
}
