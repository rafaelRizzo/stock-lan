import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD')
const utcOffset = z.string().regex(/^[+-]\d{2}:\d{2}$/, 'Use o formato +HH:MM ou -HH:MM').default('-03:00')

export const stockMovementFiltersSchema = z.object({
    product_id: z.uuid().optional(),
    type: z.enum(['entry', 'exit']).optional(),
    start_date: dateOnly.optional(),
    end_date: dateOnly.optional(),
    utc_offset: utcOffset,
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
})

export type StockMovementFilters = z.infer<typeof stockMovementFiltersSchema>
