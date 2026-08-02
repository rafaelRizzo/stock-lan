import { expect, test } from "bun:test";
import { addDays, computeNextDueDate, utcMidnight } from "../../src/lib/recurrence.js";

test("utcMidnight strips time to UTC midnight", () => {
    expect(utcMidnight(new Date("2026-03-15T23:45:00Z")).toISOString()).toBe("2026-03-15T00:00:00.000Z");
});

test("addDays adds whole days at UTC midnight", () => {
    expect(addDays(new Date("2026-03-15T10:00:00Z"), 5).toISOString()).toBe("2026-03-20T00:00:00.000Z");
});

test("computeNextDueDate keeps a future anchor untouched", () => {
    const anchor = new Date("2026-05-10T00:00:00Z");
    const result = computeNextDueDate(anchor, "WEEKLY", new Date("2026-05-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2026-05-10T00:00:00.000Z");
});

test("computeNextDueDate WEEKLY advances in 7-day steps", () => {
    const anchor = new Date("2026-01-05T00:00:00Z");
    const result = computeNextDueDate(anchor, "WEEKLY", new Date("2026-01-06T00:00:00Z"));
    expect(result.toISOString()).toBe("2026-01-12T00:00:00.000Z");
});

test("computeNextDueDate MONTHLY clamps day 31 to February's last day", () => {
    const anchor = new Date("2026-01-31T00:00:00Z");
    const result = computeNextDueDate(anchor, "MONTHLY", new Date("2026-02-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2026-02-28T00:00:00.000Z");
});

test("computeNextDueDate MONTHLY restores day 31 once the month has it", () => {
    const anchor = new Date("2026-01-31T00:00:00Z");
    const result = computeNextDueDate(anchor, "MONTHLY", new Date("2026-04-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2026-04-30T00:00:00.000Z");
});

test("computeNextDueDate YEARLY clamps Feb 29 anchor on non-leap years", () => {
    const anchor = new Date("2024-02-29T00:00:00Z");
    const result = computeNextDueDate(anchor, "YEARLY", new Date("2025-01-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2025-02-28T00:00:00.000Z");
});

test("computeNextDueDate YEARLY returns to Feb 29 once the target year is leap", () => {
    const anchor = new Date("2024-02-29T00:00:00Z");
    const result = computeNextDueDate(anchor, "YEARLY", new Date("2028-01-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2028-02-29T00:00:00.000Z");
});
