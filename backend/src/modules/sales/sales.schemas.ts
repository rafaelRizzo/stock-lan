import { z } from "zod";
import { MAX_MONEY, MAX_QUANTITY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

const saleItemSchema = z.object({
    productId: z.string().cuid(),
    quantity: z.coerce.number().positive().max(MAX_QUANTITY),
    priceUnit: z.coerce.number().positive().max(MAX_MONEY).optional(),
});

export const saleSchema = z.object({
    clientName: z.string().trim().min(1).max(160).optional(),
    status: z.enum(["PAID", "PENDING", "FREE", "DEBT"]).default("PENDING"),
    debtorId: z.string().cuid().optional(),
    paymentMethod: z.enum(["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"]).optional(),
    obs: z.string().trim().max(2000).optional(),
    items: z.array(saleItemSchema).min(1),
});

export const saleUpdateSchema = saleSchema;

export const salePaymentSchema = z.object({
    amount: z.coerce.number().positive().max(MAX_MONEY),
    method: z.enum(["CASH", "PIX", "CARD", "BANK_TRANSFER", "OTHER"]),
    obs: z.string().trim().max(2000).optional(),
});

export const saleParamsSchema = z.object({ id: z.string().cuid() });
export const saleListSchema = paginationSchema.extend({
    status: z.enum(["PAID", "PENDING", "FREE", "DEBT", "CANCELED"]).optional(),
    search: z.string().trim().max(160).optional(),
});

export type SaleInput = z.infer<typeof saleSchema>;
