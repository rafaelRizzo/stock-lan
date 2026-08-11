import { Prisma } from "@prisma/client";
import type { FastifyError, FastifyRequest } from "fastify";
import type { ZodType } from "zod";

export type LinkedRecordDetail = { label: string; count: number; path: string };

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: LinkedRecordDetail[],
    ) {
        super(message);
    }
}

export function isUniqueConstraintError(error: unknown, field?: string): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    if (!field) return true;
    const target = error.meta?.target;
    return Array.isArray(target) ? target.includes(field) : target === field;
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
    const details = error instanceof AppError ? error.details : undefined;
    return reply.status(statusCode).send({ message, statusCode, ...(details ? { details } : {}) });
}
