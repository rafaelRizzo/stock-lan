import { expect, test } from "bun:test";
import { z } from "zod";
import { AppError, parse } from "../../src/lib/errors.js";

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
