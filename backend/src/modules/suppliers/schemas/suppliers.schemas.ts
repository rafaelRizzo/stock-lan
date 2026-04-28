import { z } from 'zod'

export const createSupplierSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    phone: z.string().max(20).trim().optional(),
})

export const updateSupplierSchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    phone: z.string().max(20).trim().nullable().optional(),
    status: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
