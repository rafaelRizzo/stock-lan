import type { FastifyReply, FastifyRequest } from "fastify";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { userParamsSchema, userSchema, usersListSchema } from "./users.schemas.js";
import { usersService } from "./users.service.js";

export const usersController = {
    list: async (request: FastifyRequest) => {
        const query = parse(usersListSchema, request.query);
        const result = await usersService.list(query.search, query.status, getSkip(query), query.limit);
        return paginate(result.data, result.total, query);
    },
    create: async (request: FastifyRequest, reply: FastifyReply) =>
        reply.status(201).send(await usersService.create(parse(userSchema, request.body), request.user.sub)),
    update: (request: FastifyRequest) =>
        usersService.update(parse(userParamsSchema, request.params).id, parse(userSchema.partial(), request.body)),
    archive: async (request: FastifyRequest, reply: FastifyReply) => {
        await usersService.archive(parse(userParamsSchema, request.params).id, request.user.sub);
        return reply.status(204).send();
    },
};
