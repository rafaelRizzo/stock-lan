import { expect, mock, test } from "bun:test";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, errorHandler, isUniqueConstraintError, parse } from "../../src/lib/errors.js";

function knownRequestError(code: string, target?: string | string[]) {
    return new Prisma.PrismaClientKnownRequestError("db error", {
        code,
        clientVersion: "test",
        meta: target === undefined ? undefined : { target },
    });
}

function fakeReply() {
    const send = mock((body: unknown) => body);
    const status = mock((_code: number) => ({ send }));
    return { status, send };
}

test("returns validated input", () => {
    expect(parse(z.object({ name: z.string().min(1) }), { name: "Product" })).toEqual({ name: "Product" });
});

test("throws AppError for invalid input", () => {
    try {
        parse(z.object({ name: z.string().min(1) }), { name: "" });
        throw new Error("Expected validation to fail");
    } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
    }
});

test("isUniqueConstraintError ignores non-Prisma errors", () => {
    expect(isUniqueConstraintError(new Error("boom"))).toBeFalse();
});

test("isUniqueConstraintError ignores Prisma errors with another code", () => {
    expect(isUniqueConstraintError(knownRequestError("P2003"))).toBeFalse();
});

test("isUniqueConstraintError matches P2002 when no field filter is given", () => {
    expect(isUniqueConstraintError(knownRequestError("P2002", ["username"]))).toBeTrue();
});

test("isUniqueConstraintError matches only the requested field", () => {
    expect(isUniqueConstraintError(knownRequestError("P2002", ["username"]), "username")).toBeTrue();
    expect(isUniqueConstraintError(knownRequestError("P2002", ["username"]), "name")).toBeFalse();
    expect(isUniqueConstraintError(knownRequestError("P2002", "username"), "username")).toBeTrue();
});

test("errorHandler formats an AppError without logging it", () => {
    const request = { log: { error: mock() } };
    const reply = fakeReply();
    errorHandler(new AppError(409, "Conflict", [{ label: "x", path: "/x", count: 1 }]), request as never, reply);
    expect(request.log.error).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
        message: "Conflict",
        statusCode: 409,
        details: [{ label: "x", path: "/x", count: 1 }],
    });
});

test("errorHandler masks the message and logs unexpected 500s", () => {
    const request = { log: { error: mock() } };
    const reply = fakeReply();
    const error = Object.assign(new Error("secret internal detail"), { statusCode: 500 });
    errorHandler(error as never, request as never, reply);
    expect(request.log.error).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ message: "Internal server error", statusCode: 500 });
});

test("errorHandler defaults to 500 when the error has no statusCode", () => {
    const request = { log: { error: mock() } };
    const reply = fakeReply();
    errorHandler(new Error("oops") as never, request as never, reply);
    expect(reply.status).toHaveBeenCalledWith(500);
});
