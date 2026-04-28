import { z } from 'zod'

export const  createUnitSchema = z.object({
    name: z.string().min(1).max(100).trim(),
    abbreviation: z.string().min(1).max(20).trim(),
})

export const updateUnitSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    abbreviation: z.string().min(1).max(20).trim().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
})

export const idParamSchema = z.object({
    id: z.uuid(),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
