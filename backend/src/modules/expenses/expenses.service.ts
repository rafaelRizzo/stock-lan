import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

type ExpenseInput = {
    expenseTemplateId?: string;
    name: string;
    value: number;
    dueDate: Date;
    paidAt?: Date;
    status?: "PENDING" | "PAID" | "CANCELED";
    obs?: string;
};

export const expensesService = {
    list: async (input: {
        search?: string;
        status?: "PENDING" | "PAID" | "CANCELED";
        dueDate?: Prisma.DateTimeFilter;
        skip: number;
        take: number;
    }) => {
        const where: Prisma.ExpenseWhereInput = {
            ...(input.status ? { status: input.status } : {}),
            ...(input.dueDate ? { dueDate: input.dueDate } : {}),
            ...(input.search ? { name: { contains: input.search, mode: "insensitive" } } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: { expenseTemplate: true },
                orderBy: [{ dueDate: "asc" }, { id: "desc" }],
                skip: input.skip,
                take: input.take,
            }),
            prisma.expense.count({ where }),
        ]);
        return { data, total };
    },
    create: (input: ExpenseInput, createdUserId: string) =>
        prisma.expense.create({ data: { ...input, createdUserId } }),
    update: async (id: string, input: Partial<ExpenseInput>) => {
        const expense = await prisma.expense.findUnique({ where: { id } });
        if (!expense) throw new AppError(404, "Expense not found");
        const data: Omit<Partial<ExpenseInput>, "paidAt"> & { paidAt?: Date | null } = { ...input };
        if (data.status && data.status !== "PAID") data.paidAt = null;
        const updated = await prisma.expense.update({ where: { id }, data });
        if (expense.status === "PENDING" && updated.status !== "PENDING") {
            await prisma.notification.deleteMany({ where: { entityType: "expense", entityId: id } });
        }
        return updated;
    },
    delete: async (id: string) => {
        const expense = await prisma.expense.findUnique({ where: { id } });
        if (!expense) throw new AppError(404, "Expense not found");
        await prisma.expense.delete({ where: { id } });
        await prisma.notification.deleteMany({ where: { entityType: "expense", entityId: id } });
    },
};
