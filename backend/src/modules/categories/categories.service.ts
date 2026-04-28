import { db } from '../../db/config/db'
import { eq } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { categories } from '../../db/schemas/categories'
import type { CreateCategoryInput, UpdateCategoryInput } from './schemas/categories.schemas'

export const getAllCategories = async () => {
    return db.select().from(categories)
}

export const getCategoryById = async (id: string) => {
    const [category] = await db.select().from(categories).where(eq(categories.id, id))
    return category ?? null
}

export const createCategory = async (data: CreateCategoryInput) => {
    const [existing] = await db.select().from(categories).where(eq(categories.name, data.name))
    if (existing) throw new AppError('Já existe uma categoria com esse nome', 409)

    const [category] = await db.insert(categories).values({
        name: data.name,
        description: data.description ?? null,
    }).returning()

    if (!category) throw new AppError('Falha ao criar categoria', 500)
    return category
}

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
    if (data.name) {
        const [conflict] = await db.select().from(categories).where(eq(categories.name, data.name))
        if (conflict && conflict.id !== id) throw new AppError('Já existe uma categoria com esse nome', 409)
    }

    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning()
    if (!updated) throw new AppError('Categoria não encontrada', 404)
    return updated
}

export const deleteCategory = async (id: string) => {
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning()
    if (!deleted) throw new AppError('Categoria não encontrada', 404)
    return deleted
}
