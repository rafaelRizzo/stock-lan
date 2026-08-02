const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type RecurrenceKind = "WEEKLY" | "MONTHLY" | "YEARLY";

export function utcMidnight(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
    return new Date(utcMidnight(date).getTime() + days * MS_PER_DAY);
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addMonthsClamped(date: Date, months: number): Date {
    const day = date.getUTCDate();
    const targetMonthIndex = date.getUTCMonth() + months;
    const year = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
    const month = ((targetMonthIndex % 12) + 12) % 12;
    return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth(year, month))));
}

function addYearsClamped(date: Date, years: number): Date {
    const year = date.getUTCFullYear() + years;
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth(year, month))));
}

// Calcula a próxima ocorrência >= `from`, a partir de uma data âncora, sem depender de loops
// (soma direto a diferença de calendário e corrige +1 período se ainda cair antes de `from`).
export function computeNextDueDate(anchorDate: Date, recurrence: RecurrenceKind, from: Date): Date {
    const anchor = utcMidnight(anchorDate);
    const reference = utcMidnight(from);

    if (recurrence === "WEEKLY") {
        const diffDays = Math.round((reference.getTime() - anchor.getTime()) / MS_PER_DAY);
        const weeks = Math.max(0, Math.ceil(diffDays / 7));
        let candidate = addDays(anchor, weeks * 7);
        if (candidate < reference) candidate = addDays(candidate, 7);
        return candidate;
    }

    if (recurrence === "MONTHLY") {
        const diffMonths =
            (reference.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
            (reference.getUTCMonth() - anchor.getUTCMonth());
        const months = Math.max(0, diffMonths);
        let candidate = addMonthsClamped(anchor, months);
        if (candidate < reference) candidate = addMonthsClamped(anchor, months + 1);
        return candidate;
    }

    const diffYears = reference.getUTCFullYear() - anchor.getUTCFullYear();
    const years = Math.max(0, diffYears);
    let candidate = addYearsClamped(anchor, years);
    if (candidate < reference) candidate = addYearsClamped(anchor, years + 1);
    return candidate;
}
