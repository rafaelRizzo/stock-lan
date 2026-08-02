import type { FastifyReply, FastifyRequest } from "fastify";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { notificationParamsSchema, notificationsListSchema } from "./notifications.schemas.js";
import { notificationsService } from "./notifications.service.js";

export const notificationsController = {
    list: async (request: FastifyRequest) => {
        const query = parse(notificationsListSchema, request.query);
        const result = await notificationsService.list(request.user.sub, getSkip(query), query.limit);
        return paginate(result.data, result.total, query);
    },
    unreadCount: async (request: FastifyRequest) => ({
        count: await notificationsService.unreadCount(request.user.sub),
    }),
    markRead: async (request: FastifyRequest, reply: FastifyReply) => {
        await notificationsService.markRead(parse(notificationParamsSchema, request.params).id, request.user.sub);
        return reply.status(204).send();
    },
    markAllRead: async (request: FastifyRequest, reply: FastifyReply) => {
        await notificationsService.markAllRead(request.user.sub);
        return reply.status(204).send();
    },
    delete: async (request: FastifyRequest, reply: FastifyReply) => {
        await notificationsService.delete(parse(notificationParamsSchema, request.params).id);
        return reply.status(204).send();
    },
};
