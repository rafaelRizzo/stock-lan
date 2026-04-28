import { z } from 'zod'

export const createCategorySchema = z.object({
    name: z.string().min(1).max(255).trim(),
    description: z.string().trim().optional(),
})

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().trim().nullable().optional(),
    status: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
