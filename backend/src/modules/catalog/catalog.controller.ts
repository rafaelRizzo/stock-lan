import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { AppError, parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { type CatalogResource, catalogListSchema, idParamsSchema, userSchema } from "./catalog.schemas.js";
import { catalogService } from "./catalog.service.js";

export function createCatalogController(resource: CatalogResource) {
    return {
        list: async (request: FastifyRequest) => {
            const query = parse(catalogListSchema, request.query);
            const where = {
                ...(query.status
                    ? { status: query.status }
                    : query.includeArchived
                      ? {}
                      : { status: { not: "ARCHIVED" } }),
                ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
                ...(resource.delegate === "product" && query.type ? { type: query.type } : {}),
                ...(resource.delegate === "product" && query.typeNot ? { type: { not: query.typeNot } } : {}),
            };
            const [data, total] = await catalogService.list(
                resource,
                where,
                getSkip(query),
                query.limit,
                resource.delegate === "product" ? query.stockOrder : undefined,
            );
            return paginate(data, total, query);
        },
        get: (request: FastifyRequest) => catalogService.get(resource, parse(idParamsSchema, request.params).id),
        create: async (request: FastifyRequest, reply: FastifyReply) =>
            reply
                .status(201)
                .send(
                    await catalogService.create(
                        resource,
                        parse<Record<string, unknown>>(
                            resource.schema as unknown as z.ZodType<Record<string, unknown>>,
                            request.body,
                        ),
                        request.user.sub,
                    ),
                ),
        update: (request: FastifyRequest) =>
            catalogService.update(
                resource,
                parse(idParamsSchema, request.params).id,
                parse<Record<string, unknown>>(
                    resource.schema.partial() as unknown as z.ZodType<Record<string, unknown>>,
                    request.body,
                ),
                request.user.sub,
            ),
        archive: async (request: FastifyRequest, reply: FastifyReply) => {
            await catalogService.archive(resource, parse(idParamsSchema, request.params).id, request.user.sub);
            return reply.status(204).send();
        },
        restore: async (request: FastifyRequest, reply: FastifyReply) => {
            await catalogService.restore(resource, parse(idParamsSchema, request.params).id, request.user.sub);
            return reply.status(204).send();
        },
        permanentDelete: async (request: FastifyRequest, reply: FastifyReply) => {
            await catalogService.permanentDelete(resource, parse(idParamsSchema, request.params).id, request.user.sub);
            return reply.status(204).send();
        },
    };
}

export const usersController = {
    create: async (request: FastifyRequest, reply: FastifyReply) =>
        reply.status(201).send(await catalogService.createUser(parse(userSchema, request.body), request.user.sub)),
    unsupported: () => {
        throw new AppError(501, "Not implemented");
    },
};
