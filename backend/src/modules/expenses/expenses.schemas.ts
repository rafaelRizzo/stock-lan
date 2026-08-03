import { z } from "zod";
import { MAX_MONEY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const expenseStatusSchema = z.enum(["PENDING", "PAID", "CANCELED"]);
export const expenseSchema = z.object({
    expenseTemplateId: z.string().cuid().optional(),
    name: z.string().trim().min(1).max(160),
    value: z.coerce.number().positive().max(MAX_MONEY),
    dueDate: z.coerce.date(),
    paidAt: z.coerce.date().optional(),
    status: expenseStatusSchema.default("PENDING"),
    obs: z.string().trim().max(2000).optional(),
});
export const expenseParamsSchema = z.object({ id: z.string().cuid() });
export const expensesListSchema = paginationSchema.extend({
    search: z.string().trim().max(160).optional(),
    status: expenseStatusSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});
