import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { createAuthController } from "./auth.controller.js";

export async function registerAuthRoutes(
    app: FastifyInstance,
) {
    const controller = createAuthController(app);
    // biome-ignore format: route declarations stay vertically readable
    app.post(
        "/auth/login",
        {
            config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
            schema: { tags: ["auth"] },
        },
        controller.login,
    );
    app.get(
        "/auth/setup",
        {
            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: "1 minute",
                },
            },
            schema: { tags: ["auth"] },
        },
        controller.setupStatus,
    );
    app.post(
        "/auth/setup",
        {
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "1 minute",
                },
            },
            schema: { tags: ["auth"] },
        },
        controller.setup,
    );
    // biome-ignore format: route declarations stay vertically readable
    app.post(
        "/auth/refresh",
        {
            config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
            schema: { tags: ["auth"] },
        },
        controller.refresh,
    );
    // biome-ignore format: route declarations stay vertically readable
    app.post(
        "/auth/logout",
        { preHandler: authenticate, schema: { tags: ["auth"] } },
        controller.logout,
    );
    // biome-ignore format: route declarations stay vertically readable
    app.get(
        "/auth/me",
        { preHandler: authenticate, schema: { tags: ["auth"] } },
        controller.me,
    );
}
