import { z } from "zod";
import { MAX_MONEY, MAX_QUANTITY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const stockBatchSchema = z.object({
    supplierId: z.string().cuid(),
    productId: z.string().cuid(),
    quantityTypeId: z.string().cuid(),
    quantityIn: z.coerce.number().positive().max(MAX_QUANTITY),
    priceBuy: z.coerce.number().positive().max(MAX_MONEY),
    dateBuy: z.coerce.date(),
    notifyLimit: z.boolean().default(false),
    quantityNotify: z.coerce.number().positive().max(MAX_QUANTITY).optional(),
    obs: z.string().trim().max(2000).optional(),
});

export const stockBatchUpdateSchema = stockBatchSchema;

export const noCostStockSchema = z.object({
    productId: z.string().cuid(),
    supplierId: z.string().cuid().optional(),
    quantityTypeId: z.string().cuid(),
    quantity: z.coerce.number().positive().max(MAX_QUANTITY),
    obs: z.string().trim().max(2000).optional(),
});

export const stockAdjustmentSchema = z.object({
    stockBatchId: z.string().cuid(),
    quantity: z.coerce
        .number()
        .min(-MAX_QUANTITY)
        .max(MAX_QUANTITY)
        .refine((value) => value !== 0),
    obs: z.string().trim().min(1).max(2000),
});

export const stockBatchParamsSchema = z.object({ id: z.string().cuid() });
export const stockProductParamsSchema = z.object({ productId: z.string().cuid() });
export const stockBatchListSchema = paginationSchema.extend({
    search: z.string().trim().max(160).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});
export const stockMovementListSchema = paginationSchema.extend({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});
