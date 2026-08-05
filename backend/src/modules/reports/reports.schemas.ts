import { z } from "zod";
import { MAX_MONEY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const debtsReportQuerySchema = paginationSchema.extend({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    debtorId: z.string().cuid().optional(),
});

export const debtorStatementParamsSchema = z.object({ debtorId: z.string().cuid() });

export const receiveDebtPaymentSchema = z.object({
    amount: z.coerce.number().positive().max(MAX_MONEY),
    method: z.enum(["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"]),
    obs: z.string().trim().max(2000).optional(),
});

export const dashboardReportQuerySchema = z
    .object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
    })
    .refine((value) => Boolean(value.startDate) === Boolean(value.endDate), {
        message: "startDate and endDate must be provided together",
    })
    .refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
        message: "startDate must be before or equal to endDate",
    })
    .refine(
        (value) =>
            !value.startDate ||
            !value.endDate ||
            value.endDate.getTime() - value.startDate.getTime() <= 366 * 24 * 60 * 60 * 1000,
        { message: "The date range cannot exceed 366 days" },
    );
