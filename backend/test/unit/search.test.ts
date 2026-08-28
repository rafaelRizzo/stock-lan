import { beforeEach, expect, mock, test } from "bun:test";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const queryRawMock = mock();
mock.module("../../src/lib/prisma.js", () => ({ prisma: { $queryRaw: queryRawMock } }));

const { unaccentSearchIds } = await import("../../src/lib/search.js");

beforeEach(() => {
    queryRawMock.mockReset();
});

test("resolves matching ids ignoring case and accents", async () => {
    queryRawMock.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);
    const ids = await unaccentSearchIds("Product", ["name"], "creme");
    expect(ids).toEqual(["p1", "p2"]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const [sql] = queryRawMock.mock.calls[0];
    expect(sql.strings.join("")).toContain("SELECT id FROM");
    expect(sql.values).toContain("%creme%");
});

test("returns an empty list when nothing matches", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    expect(await unaccentSearchIds("Supplier", ["name"], "xyz")).toEqual([]);
});

test("combines multiple columns with OR", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await unaccentSearchIds("StockBatch", ["name", "obs"], "term");
    const [sql] = queryRawMock.mock.calls[0];
    expect(sql.strings.join("")).toContain(" OR ");
});
