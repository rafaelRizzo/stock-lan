import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

type CashMovementInput = {
    type: "DEPOSIT" | "WITHDRAWAL";
    value: number;
    obs?: string;
};

export const cashMovementsService = {
    list: async (input: {
        type?: "DEPOSIT" | "WITHDRAWAL";
        createdAt?: Prisma.DateTimeFilter;
        skip: number;
        take: number;
    }) => {
        const where: Prisma.CashMovementWhereInput = {
            ...(input.type ? { type: input.type } : {}),
            ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.cashMovement.findMany({
                where,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: input.skip,
                take: input.take,
            }),
            prisma.cashMovement.count({ where }),
        ]);
        return { data, total };
    },
    balance: async () => {
        const [deposits, withdrawals] = await Promise.all([
            prisma.cashMovement.aggregate({ where: { type: "DEPOSIT" }, _sum: { value: true } }),
            prisma.cashMovement.aggregate({ where: { type: "WITHDRAWAL" }, _sum: { value: true } }),
        ]);
        const deposited = deposits._sum.value ?? new Prisma.Decimal(0);
        const withdrawn = withdrawals._sum.value ?? new Prisma.Decimal(0);
        return { balance: deposited.sub(withdrawn), deposited, withdrawn };
    },
    create: (input: CashMovementInput, createdUserId: string) =>
        prisma.cashMovement.create({ data: { ...input, createdUserId } }),
    delete: async (id: string) => {
        const movement = await prisma.cashMovement.findUnique({ where: { id } });
        if (!movement) throw new AppError(404, "Cash movement not found");
        if (movement.stockBatchId || movement.paymentId || movement.expenseId)
            throw new AppError(409, "Cash movement linked to another record cannot be deleted directly");
        await prisma.cashMovement.delete({ where: { id } });
    },
};
