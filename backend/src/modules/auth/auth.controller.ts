import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parse } from "../../lib/errors.js";
import { loginSchema, refreshSchema, setupSchema } from "./auth.schemas.js";
import { authService } from "./auth.service.js";

export function createAuthController(app: FastifyInstance) {
    return {
        login: (request: FastifyRequest) => {
            const input = parse(loginSchema, request.body);
            return authService.login(app, input.username, input.password);
        },
        setupStatus: () => authService.setupStatus(),
        setup: async (request: FastifyRequest, reply: FastifyReply) =>
            reply.status(201).send(await authService.setup(app, parse(setupSchema, request.body))),
        refresh: (request: FastifyRequest) => authService.refresh(app, parse(refreshSchema, request.body).refreshToken),
        logout: async (request: FastifyRequest, reply: FastifyReply) => {
            await authService.logout(parse(refreshSchema, request.body).refreshToken, request.user.sub);
            return reply.status(204).send();
        },
        me: (request: FastifyRequest) => authService.me(request.user.sub),
    };
}
