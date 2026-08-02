import type { FastifyInstance } from "fastify";
import {
    authenticate,
    requireRole,
} from "../../middlewares/auth.middleware.js";
import { stockController } from "./stock.controller.js";

export async function registerStockRoutes(
    app: FastifyInstance,
) {
    app.post(
        "/stock/batches",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["stock"] },
        },
        stockController.createBatch,
    );
    app.get(
        "/stock/batches",
        {
            preHandler: authenticate,
            schema: { tags: ["stock"] },
        },
        stockController.listBatches,
    );
    app.get(
        "/stock/batches/:id",
        {
            preHandler: authenticate,
            schema: { tags: ["stock"] },
        },
        stockController.getBatch,
    );
    app.patch(
        "/stock/batches/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["stock"] },
        },
        stockController.updateBatch,
    );
    app.delete(
        "/stock/batches/:id",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["stock"] },
        },
        stockController.deleteBatch,
    );
    app.get(
        "/stock/products/:productId",
        {
            preHandler: authenticate,
            schema: { tags: ["stock"] },
        },
        stockController.getProductStock,
    );
    app.post(
        "/stock/adjustments",
        {
            preHandler: requireRole("ADMIN", "MANAGER"),
            schema: { tags: ["stock"] },
        },
        stockController.adjust,
    );
    app.get(
        "/stock/alerts",
        {
            preHandler: authenticate,
            schema: { tags: ["stock"] },
        },
        stockController.listAlerts,
    );
    app.get(
        "/stock/movements",
        {
            preHandler: authenticate,
            schema: { tags: ["stock"] },
        },
        stockController.listMovements,
    );
}
