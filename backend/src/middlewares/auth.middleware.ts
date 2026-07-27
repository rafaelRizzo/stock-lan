import type { FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";

export async function authenticate(request: FastifyRequest) {
    try {
        await request.jwtVerify();
    } catch {
        throw new AppError(401, "Unauthorized");
    }
}

export function requireRole(...roles: Array<"ADMIN" | "MANAGER" | "OPERATOR">) {
    return async (request: FastifyRequest) => {
        await authenticate(request);
        if (!roles.includes(request.user.role)) throw new AppError(403, "Forbidden");
    };
}
