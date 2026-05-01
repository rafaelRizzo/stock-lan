import { z } from 'zod'

export const createDebtorSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    phone: z.string().max(20).trim().optional(),
    notes: z.string().trim().optional(),
})

export const updateDebtorSchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    phone: z.string().max(20).trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    status: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
})

export const listDebtorsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.enum(['true', 'false']).optional(),
})

const validDate = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD')
    .refine(d => {
        const parts = d.split('-').map(Number)
        const [y, m, day] = parts as [number, number, number]
        const date = new Date(Date.UTC(y, m - 1, day))
        return date.getUTCMonth() === m - 1 && date.getUTCDate() === day
    }, 'Data inválida')
    .optional()

export const debtorSummaryQuerySchema = z.object({
    start_date: validDate,
    end_date: validDate,
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateDebtorInput = z.infer<typeof createDebtorSchema>
export type UpdateDebtorInput = z.infer<typeof updateDebtorSchema>
export type ListDebtorsQuery = z.infer<typeof listDebtorsQuerySchema>
export type DebtorSummaryQuery = z.infer<typeof debtorSummaryQuerySchema>
