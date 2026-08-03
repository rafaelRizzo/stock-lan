export function dateRangeFilter(from?: Date, to?: Date) {
    if (!from && !to) return undefined;
    const range: { gte?: Date; lt?: Date } = {};
    if (from) {
        const start = new Date(from);
        start.setUTCHours(0, 0, 0, 0);
        range.gte = start;
    }
    if (to) {
        const end = new Date(to);
        end.setUTCHours(0, 0, 0, 0);
        end.setUTCDate(end.getUTCDate() + 1);
        range.lt = end;
    }
    return range;
}
