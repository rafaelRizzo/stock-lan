import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { notificationsController } from "./notifications.controller.js";

export async function registerNotificationsRoutes(app: FastifyInstance) {
    app.get(
        "/notifications",
        { preHandler: requireRole("ADMIN", "MANAGER"), schema: { tags: ["notifications"] } },
        notificationsController.list,
    );
    app.get(
        "/notifications/unread-count",
        { preHandler: requireRole("ADMIN", "MANAGER"), schema: { tags: ["notifications"] } },
        notificationsController.unreadCount,
    );
    app.patch(
        "/notifications/read-all",
        { preHandler: requireRole("ADMIN", "MANAGER"), schema: { tags: ["notifications"] } },
        notificationsController.markAllRead,
    );
    app.patch(
        "/notifications/:id/read",
        { preHandler: requireRole("ADMIN", "MANAGER"), schema: { tags: ["notifications"] } },
        notificationsController.markRead,
    );
    app.delete(
        "/notifications/:id",
        { preHandler: requireRole("ADMIN", "MANAGER"), schema: { tags: ["notifications"] } },
        notificationsController.delete,
    );
}
