import { invalidate, invalidatePrefix } from "../lib/cache.js";
import { prisma } from "../lib/prisma.js";
import { addDays, computeNextDueDate, type RecurrenceKind, utcMidnight } from "../lib/recurrence.js";

const currency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export async function runExpenseRecurrenceJob() {
    const today = utcMidnight(new Date());

    const dueTemplates = await prisma.expenseTemplate.findMany({
        where: { status: "ACTIVE", recurrence: { not: "ONE_TIME" }, nextDueDate: { lte: today } },
    });
    if (!dueTemplates.length) return;

    let processed = 0;
    for (const template of dueTemplates) {
        const nextDueDate = computeNextDueDate(
            template.anchorDate as Date,
            template.recurrence as RecurrenceKind,
            addDays(template.nextDueDate as Date, 1),
        );

        // Claim atômico via SQL: só segue se nextDueDate ainda for o valor lido agora.
        // Evita duplicar a despesa caso o job rode duas vezes seguidas ou em paralelo,
        // sem precisar de lock externo (Postgres já serializa o UPDATE por linha).
        const claimed = await prisma.expenseTemplate.updateMany({
            where: { id: template.id, nextDueDate: template.nextDueDate },
            data: { nextDueDate },
        });
        if (claimed.count === 0) continue;

        const expense = await prisma.expense.create({
            data: {
                expenseTemplateId: template.id,
                name: template.name,
                value: template.defaultValue,
                dueDate: template.nextDueDate as Date,
                status: "PENDING",
                createdUserId: template.createdUserId,
            },
        });
        await prisma.notification.create({
            data: {
                type: "EXPENSE_DUE",
                title: "Despesa vencendo hoje",
                message: `${template.name} (${currency(Number(template.defaultValue))}) vence hoje.`,
                entityType: "expense",
                entityId: expense.id,
            },
        });
        processed++;
    }

    if (processed) {
        await invalidate("dashboard");
        await invalidatePrefix("reports:");
        await invalidatePrefix("catalog:expenseTemplate:");
    }
}

function daysUntilLabel(days: number) {
    if (days <= 0) return "vence hoje";
    if (days === 1) return "vence amanhã";
    return `vence em ${days} dias`;
}

export async function runExpenseUpcomingNotificationJob() {
    const today = utcMidnight(new Date());
    const horizon = addDays(today, 365);

    const templates = await prisma.expenseTemplate.findMany({
        where: {
            status: "ACTIVE",
            recurrence: { not: "ONE_TIME" },
            notifyDaysBefore: { not: null },
            nextDueDate: { gte: today, lte: horizon },
        },
    });
    if (!templates.length) return;

    let processed = 0;
    for (const template of templates) {
        const nextDueDate = template.nextDueDate as Date;
        const notifyAt = addDays(nextDueDate, -(template.notifyDaysBefore as number));
        if (notifyAt > today) continue;

        // Uma notificação por ocorrência: entityId embute a data de vencimento,
        // então uma nova é criada só quando o template avança pra próxima ocorrência.
        const entityId = `${template.id}:${nextDueDate.toISOString().slice(0, 10)}`;
        const alreadyNotified = await prisma.notification.findFirst({
            where: { type: "EXPENSE_UPCOMING", entityId },
            select: { id: true },
        });
        if (alreadyNotified) continue;

        const daysLeft = Math.round((nextDueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        await prisma.notification.create({
            data: {
                type: "EXPENSE_UPCOMING",
                title: "Despesa próxima do vencimento",
                message: `${template.name} (${currency(Number(template.defaultValue))}) ${daysUntilLabel(daysLeft)}.`,
                entityType: "expense-template",
                entityId,
            },
        });
        processed++;
    }

    if (processed) await invalidate("dashboard");
}
