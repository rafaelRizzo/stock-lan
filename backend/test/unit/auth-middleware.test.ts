import { expect, mock, test } from "bun:test";
import type { FastifyRequest } from "fastify";
import { authenticate, requireRole } from "../../src/middlewares/auth.middleware.js";

function fakeRequest(overrides: { jwtVerify?: () => Promise<void>; role?: string } = {}) {
    return {
        jwtVerify: overrides.jwtVerify ?? mock(async () => undefined),
        user: { sub: "user1", role: overrides.role },
    } as unknown as FastifyRequest;
}

test("authenticate passes through when the token is valid", async () => {
    const request = fakeRequest();
    await expect(authenticate(request)).resolves.toBeUndefined();
});

test("authenticate throws a 401 AppError when jwtVerify fails", async () => {
    const request = fakeRequest({
        jwtVerify: mock(async () => {
            throw new Error("invalid token");
        }),
    });
    await expect(authenticate(request)).rejects.toMatchObject({ statusCode: 401, message: "Unauthorized" });
});

test("requireRole allows a request whose role is in the allow-list", async () => {
    const request = fakeRequest({ role: "ADMIN" });
    await expect(requireRole("ADMIN", "MANAGER")(request)).resolves.toBeUndefined();
});

test("requireRole throws a 403 AppError when the role is not allowed", async () => {
    const request = fakeRequest({ role: "OPERATOR" });
    await expect(requireRole("ADMIN", "MANAGER")(request)).rejects.toMatchObject({
        statusCode: 403,
        message: "Forbidden",
    });
});

test("requireRole propagates the 401 from authenticate before checking the role", async () => {
    const request = fakeRequest({
        role: "ADMIN",
        jwtVerify: mock(async () => {
            throw new Error("invalid token");
        }),
    });
    await expect(requireRole("ADMIN")(request)).rejects.toMatchObject({ statusCode: 401 });
});
