import { z } from 'zod'

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
    items: z.array(stockExitItemSchema).min(1, 'Informe ao menos um item'),
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateStockExitInput = z.infer<typeof createStockExitSchema>
export type StockExitItemInput = z.infer<typeof stockExitItemSchema>
