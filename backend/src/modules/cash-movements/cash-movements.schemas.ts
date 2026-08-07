import { z } from "zod";
import { MAX_MONEY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const cashMovementTypeSchema = z.enum(["DEPOSIT", "WITHDRAWAL"]);
export const cashMovementSchema = z.object({
    type: cashMovementTypeSchema,
    value: z.coerce.number().positive().max(MAX_MONEY),
    obs: z.string().trim().max(2000).optional(),
});
export const cashMovementParamsSchema = z.object({ id: z.string().cuid() });
export const cashMovementsListSchema = paginationSchema.extend({
    type: cashMovementTypeSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});
