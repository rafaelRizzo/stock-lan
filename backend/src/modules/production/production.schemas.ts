import { z } from "zod";
import { MAX_QUANTITY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const recipeItemInputSchema = z.object({
    rawProductId: z.string().cuid(),
    quantityPerUnit: z.coerce.number().positive().max(MAX_QUANTITY),
});

export const recipeReplaceSchema = z.object({
    items: z.array(recipeItemInputSchema).min(1),
});

export const productionOrderSchema = z.object({
    finishedProductId: z.string().cuid(),
    quantityTypeId: z.string().cuid(),
    quantityProduced: z.coerce.number().positive().max(MAX_QUANTITY),
    dateProduced: z.coerce.date(),
    obs: z.string().trim().max(2000).optional(),
});

export const productionOrderUpdateSchema = productionOrderSchema;

export const productProductionParamsSchema = z.object({ productId: z.string().cuid() });
export const productionOrderParamsSchema = z.object({ id: z.string().cuid() });
export const productionOrderListSchema = paginationSchema.extend({
    search: z.string().trim().max(160).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
