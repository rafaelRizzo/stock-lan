import { z } from 'zod'

export const PAYMENT_STATUSES = ['pending', 'paid', 'partial', 'cancelled'] as const
export type PaymentStatus = typeof PAYMENT_STATUSES[number]

export const stockExitItemSchema = z.object({
    product_id: z.uuid(),
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
})

export const createStockExitSchema = z.object({
    reason: z.string().min(1).max(255).trim(),
    destination: z.string().max(255).trim().optional(),
    notes: z.string().trim().optional(),
    exit_date: z.string().datetime().optional(),
    payment_status: z.enum(PAYMENT_STATUSES).default('pending'),
    paid_at: z.string().datetime().optional(),
    debtor_id: z.uuid().optional(),
    items: z.array(stockExitItemSchema).min(1, 'Informe ao menos um item'),
})

export const updatePaymentStatusSchema = z.object({
    payment_status: z.enum(PAYMENT_STATUSES),
    paid_at: z.string().datetime().optional(),
})

export const listExitsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    payment_status: z.string().optional(),
    debtor_id: z.uuid().optional(),
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateStockExitInput = z.infer<typeof createStockExitSchema>
export type StockExitItemInput = z.infer<typeof stockExitItemSchema>
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>
export type ListExitsQuery = z.infer<typeof listExitsQuerySchema>
