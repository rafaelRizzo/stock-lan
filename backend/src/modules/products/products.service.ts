import { db } from '../../db/config/db'
import { and, desc, eq } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { products } from '../../db/schemas/products'
import { stockMovements } from '../../db/schemas/stockMovements'
import { units } from '../../db/schemas/units'
import { categories } from '../../db/schemas/categories'
import type { CreateProductInput, UpdateProductInput } from './schemas/products.schemas'

export const getAllProducts = async () => {
    return db.select().from(products)
}

export const getProductById = async (id: string) => {
    const [product] = await db.select().from(products).where(eq(products.id, id))
    return product ?? null
}

export const createProduct = async (data: CreateProductInput) => {
    if (data.code != null) {
        const [existing] = await db.select().from(products).where(eq(products.code, data.code))
        if (existing) throw new AppError('Já existe um produto com esse código', 409)
    }

    if (data.unit_id) {
        const [unit] = await db.select().from(units).where(eq(units.id, data.unit_id))
        if (!unit) throw new AppError('Unidade não encontrada', 404)
    }

    if (data.category_id) {
        const [cat] = await db.select().from(categories).where(eq(categories.id, data.category_id))
        if (!cat) throw new AppError('Categoria não encontrada', 404)
    }

    const [product] = await db.insert(products).values({
        code: data.code ?? null,
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id ?? null,
        unit_id: data.unit_id,
        cost_price: data.cost_price.toFixed(2),
        sale_price: data.sale_price.toFixed(2),
        min_stock: data.min_stock.toFixed(3)
    }).returning()

    if (!product) throw new AppError('Falha ao criar produto', 500)
    return product
}

export const updateProduct = async (id: string, data: UpdateProductInput) => {
    if (data.code != null) {
        const [conflict] = await db.select().from(products).where(eq(products.code, data.code))
        if (conflict && conflict.id !== id) throw new AppError('Já existe um produto com esse código', 409)
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.cost_price !== undefined) updateData.cost_price = data.cost_price.toFixed(2)
    if (data.sale_price !== undefined) updateData.sale_price = data.sale_price.toFixed(2)
    if (data.min_stock !== undefined) updateData.min_stock = data.min_stock.toFixed(3)

    const [updated] = await db.update(products).set(updateData).where(eq(products.id, id)).returning()
    if (!updated) throw new AppError('Produto não encontrado', 404)
    return updated
}

export const deleteProduct = async (id: string) => {
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning()
    if (!deleted) throw new AppError('Produto não encontrado', 404)
    return deleted
}

export const getProductMovements = async (id: string, limit = 50, offset = 0) => {
    const [product] = await db.select().from(products).where(eq(products.id, id))
    if (!product) throw new AppError('Produto não encontrado', 404)

    const movements = await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.product_id, id))
        .orderBy(desc(stockMovements.created_at))
        .limit(limit)
        .offset(offset)

    return { product, movements }
}
