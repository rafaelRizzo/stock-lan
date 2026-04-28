import { z } from 'zod'

export const createProductSchema = z.object({
    code: z.string().max(100).trim().optional(),
    name: z.string().min(1).max(255).trim(),
    description: z.string().trim().optional(),
    category_id: z.uuid().optional(),
    unit_id: z.uuid(),
    cost_price: z.number().min(0).default(0),
    sale_price: z.number().min(0).default(0),
    min_stock: z.number().min(0).default(0)
})

export const updateProductSchema = z.object({
    code: z.string().max(100).trim().nullable().optional(),
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().trim().nullable().optional(),
    category_id: z.uuid().nullable().optional(),
    unit_id: z.uuid().optional(),
    cost_price: z.number().min(0).optional(),
    sale_price: z.number().min(0).optional(),
    min_stock: z.number().min(0).optional(),
    status: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
