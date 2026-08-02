import { expect, test } from "bun:test";
import { getSkip, paginate, paginationSchema } from "../../src/lib/pagination.js";

test("creates page metadata", () => {
    expect(paginate(["a"], 21, { page: 2, limit: 20 })).toEqual({
        data: ["a"],
        total: 21,
        totalPage: 2,
        page: 2,
        limit: 20,
    });
});

test("calculates skip", () => {
    expect(getSkip({ page: 1, limit: 20 })).toBe(0);
    expect(getSkip({ page: 3, limit: 20 })).toBe(40);
});

test("validates pagination bounds", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
});
