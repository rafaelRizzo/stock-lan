import { z } from 'zod'

export const stockEntryItemSchema = z.object({
    product_id: z.uuid(),
    quantity: z.number().positive(),
    unit_cost: z.number().min(0),
})

export const createStockEntrySchema = z.object({
    supplier_id: z.uuid().optional(),
    invoice_number: z.string().max(100).trim().optional(),
    notes: z.string().trim().optional(),
    entry_date: z.string().datetime().optional(),
    items: z.array(stockEntryItemSchema).min(1, 'Informe ao menos um item'),
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateStockEntryInput = z.infer<typeof createStockEntrySchema>
export type StockEntryItemInput = z.infer<typeof stockEntryItemSchema>
