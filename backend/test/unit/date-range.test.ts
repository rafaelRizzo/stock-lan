import { expect, test } from "bun:test";
import { dateRangeFilter } from "../../src/lib/date-range.js";

test("returns undefined when no bound is given", () => {
    expect(dateRangeFilter()).toBeUndefined();
});

test("returns only gte when just the start date is given", () => {
    const result = dateRangeFilter(new Date("2026-03-05T15:30:00Z"));
    expect(result).toEqual({ gte: new Date("2026-03-05T00:00:00Z") });
});

test("returns only lt (exclusive, +1 day) when just the end date is given", () => {
    const result = dateRangeFilter(undefined, new Date("2026-03-05T15:30:00Z"));
    expect(result).toEqual({ lt: new Date("2026-03-06T00:00:00Z") });
});

test("returns both bounds when start and end are given", () => {
    const result = dateRangeFilter(new Date("2026-03-01T09:00:00Z"), new Date("2026-03-05T23:00:00Z"));
    expect(result).toEqual({ gte: new Date("2026-03-01T00:00:00Z"), lt: new Date("2026-03-06T00:00:00Z") });
});
