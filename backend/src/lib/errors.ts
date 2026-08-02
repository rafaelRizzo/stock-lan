import type { FastifyError, FastifyRequest } from "fastify";
import type { ZodType } from "zod";

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
    }
}

export function parse<T>(schema: ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new AppError(400, result.error.issues.map((issue) => issue.message).join(", "));
    return result.data as T;
}

export function errorHandler(
    error: FastifyError | AppError,
    request: FastifyRequest,
    reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
    if (!(error instanceof AppError)) request.log.error({ err: error }, "Request failed");
    const statusCode = error instanceof AppError ? error.statusCode : (error.statusCode ?? 500);
    const message = statusCode >= 500 ? "Internal server error" : error.message;
    return reply.status(statusCode).send({ message, statusCode });
}
