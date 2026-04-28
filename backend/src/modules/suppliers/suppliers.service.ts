import { db } from '../../db/config/db'
import { eq } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { suppliers } from '../../db/schemas/suppliers'
import type { CreateSupplierInput, UpdateSupplierInput } from './schemas/suppliers.schemas'

export const getAllSuppliers = async () => {
    return db.select().from(suppliers)
}

export const getSupplierById = async (id: string) => {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id))
    return supplier ?? null
}

export const createSupplier = async (data: CreateSupplierInput) => {
    const [supplier] = await db.insert(suppliers).values({
        name: data.name,
        phone: data.phone ?? null,
    }).returning()

    if (!supplier) throw new AppError('Falha ao criar fornecedor', 500)
    return supplier
}

export const updateSupplier = async (id: string, data: UpdateSupplierInput) => {
    const [updated] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning()
    if (!updated) throw new AppError('Fornecedor não encontrado', 404)
    return updated
}

export const deleteSupplier = async (id: string) => {
    const [deleted] = await db.delete(suppliers).where(eq(suppliers.id, id)).returning()
    if (!deleted) throw new AppError('Fornecedor não encontrado', 404)
    return deleted
}
