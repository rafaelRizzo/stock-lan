import type { FastifyReply, FastifyRequest } from "fastify";
import { parse } from "../../lib/errors.js";
import { getSkip, paginate } from "../../lib/pagination.js";
import { supplierParamsSchema, supplierSchema, suppliersListSchema } from "./suppliers.schemas.js";
import { suppliersService } from "./suppliers.service.js";

export const suppliersController = {
    list: async (request: FastifyRequest) => {
        const query = parse(suppliersListSchema, request.query);
        const result = await suppliersService.list({ ...query, skip: getSkip(query), take: query.limit });
        return paginate(result.data, result.total, query);
    },
    create: async (request: FastifyRequest, reply: FastifyReply) =>
        reply.status(201).send(await suppliersService.create(parse(supplierSchema, request.body), request.user.sub)),
    update: (request: FastifyRequest) =>
        suppliersService.update(
            parse(supplierParamsSchema, request.params).id,
            parse(supplierSchema.partial(), request.body),
        ),
    archive: async (request: FastifyRequest, reply: FastifyReply) => {
        await suppliersService.archive(parse(supplierParamsSchema, request.params).id);
        return reply.status(204).send();
    },
    permanentDelete: async (request: FastifyRequest, reply: FastifyReply) => {
        await suppliersService.permanentDelete(parse(supplierParamsSchema, request.params).id);
        return reply.status(204).send();
    },
};
