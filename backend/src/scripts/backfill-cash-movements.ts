import { prisma } from "../lib/prisma.js";

const expenses = await prisma.expense.findMany({
    where: { status: "PAID", cashMovement: null },
    select: { id: true, name: true, value: true, createdUserId: true },
});

const payments = await prisma.payment.findMany({
    where: { cashMovement: null },
    select: { id: true, saleId: true, amount: true, createdUserId: true },
});

await prisma.$transaction(async (tx) => {
    for (const expense of expenses) {
        await tx.cashMovement.create({
            data: {
                type: "WITHDRAWAL",
                value: expense.value,
                obs: `Despesa: ${expense.name}`,
                expenseId: expense.id,
                createdUserId: expense.createdUserId,
            },
        });
    }
    for (const payment of payments) {
        await tx.cashMovement.create({
            data: {
                type: "DEPOSIT",
                value: payment.amount,
                obs: `Venda (${payment.saleId})`,
                paymentId: payment.id,
                createdUserId: payment.createdUserId,
            },
        });
    }
});

console.log(`Backfill concluído: ${expenses.length} despesas debitadas, ${payments.length} pagamentos creditados.`);
await prisma.$disconnect();
