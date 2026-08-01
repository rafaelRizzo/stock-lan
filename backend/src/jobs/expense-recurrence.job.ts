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
