import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const stockBatchSchema = z.object({
    supplierId: z.string().cuid(),
    productId: z.string().cuid(),
    quantityTypeId: z.string().cuid(),
    quantityIn: z.coerce.number().positive(),
    priceBuy: z.coerce.number().positive(),
    dateBuy: z.coerce.date(),
    notifyLimit: z.boolean().default(false),
    quantityNotify: z.coerce.number().positive().optional(),
    obs: z.string().trim().max(2000).optional(),
});

export const stockBatchUpdateSchema = stockBatchSchema;

export const stockAdjustmentSchema = z.object({
    stockBatchId: z.string().cuid(),
    quantity: z.coerce.number().refine((value) => value !== 0),
    obs: z.string().trim().min(1).max(2000),
});

export const stockBatchParamsSchema = z.object({ id: z.string().cuid() });
export const stockProductParamsSchema = z.object({ productId: z.string().cuid() });
export const stockBatchListSchema = paginationSchema.extend({
    search: z.string().trim().max(160).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
