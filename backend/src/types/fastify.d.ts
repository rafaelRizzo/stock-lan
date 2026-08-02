import "@fastify/jwt";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { sub: string; role: "ADMIN" | "MANAGER" | "OPERATOR" };
        user: { sub: string; role: "ADMIN" | "MANAGER" | "OPERATOR" };
    }
}
