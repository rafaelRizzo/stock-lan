import { db } from '../../db/config/db'
import { eq, or } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { units } from '../../db/schemas/units'
import type { CreateUnitInput, UpdateUnitInput } from './schemas/units.schemas'

export const getAllUnits = async () => {
    return db.select().from(units)
}

export const getUnitById = async (id: string) => {
    const [unit] = await db.select().from(units).where(eq(units.id, id))
    return unit ?? null
}

export const createUnit = async (data: CreateUnitInput) => {
    const [existing] = await db.select().from(units).where(
        or(eq(units.name, data.name), eq(units.abbreviation, data.abbreviation))
    )
    if (existing) throw new AppError('Já existe uma unidade com esse nome ou abreviação', 409)

    const [unit] = await db.insert(units).values({
        name: data.name,
        abbreviation: data.abbreviation,
    }).returning()

    if (!unit) throw new AppError('Falha ao criar unidade', 500)
    return unit
}

export const updateUnit = async (id: string, data: UpdateUnitInput) => {
    if (data.name || data.abbreviation) {
        const conditions = []
        if (data.name) conditions.push(eq(units.name, data.name))
        if (data.abbreviation) conditions.push(eq(units.abbreviation, data.abbreviation))

        const [conflict] = await db.select().from(units).where(or(...conditions))
        if (conflict && conflict.id !== id) throw new AppError('Já existe uma unidade com esse nome ou abreviação', 409)
    }

    const [updated] = await db.update(units).set(data).where(eq(units.id, id)).returning()
    if (!updated) throw new AppError('Unidade não encontrada', 404)
    return updated
}

export const deleteUnit = async (id: string) => {
    const [deleted] = await db.delete(units).where(eq(units.id, id)).returning()
    if (!deleted) throw new AppError('Unidade não encontrada', 404)
    return deleted
}
