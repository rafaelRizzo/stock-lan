import { db } from '../../db/config/db'
import { desc, eq, inArray } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { products } from '../../db/schemas/products'
import { stockEntries, stockEntryItems } from '../../db/schemas/stockEntries'
import { stockMovements } from '../../db/schemas/stockMovements'
import type { CreateStockEntryInput } from './schemas/stockEntries.schemas'

export const getAllStockEntries = async (limit = 50, offset = 0) => {
    return db.select().from(stockEntries).orderBy(desc(stockEntries.created_at)).limit(limit).offset(offset)
}

export const getStockEntryById = async (id: string) => {
    const [entry] = await db.select().from(stockEntries).where(eq(stockEntries.id, id))
    if (!entry) return null

    const items = await db.select().from(stockEntryItems).where(eq(stockEntryItems.entry_id, id))
    return { ...entry, items }
}

export const createStockEntry = async (data: CreateStockEntryInput, userId: string) => {
    const uniqueProductIds = [...new Set(data.items.map(i => i.product_id))]

    const foundProducts = await db.select().from(products).where(inArray(products.id, uniqueProductIds))
    if (foundProducts.length !== uniqueProductIds.length) {
        throw new AppError('Um ou mais produtos não encontrados', 404)
    }

    const productMap = new Map(foundProducts.map(p => [p.id, p]))

    const totalValue = data.items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)

    const entry = await db.transaction(async (tx) => {
        const [newEntry] = await tx.insert(stockEntries).values({
            supplier_id: data.supplier_id ?? null,
            invoice_number: data.invoice_number ?? null,
            notes: data.notes ?? null,
            total_value: totalValue.toFixed(2),
            entry_date: data.entry_date ? new Date(data.entry_date) : new Date(),
            created_by: userId,
        }).returning()

        if (!newEntry) throw new AppError('Falha ao registrar entrada', 500)

        for (const item of data.items) {
            const product = productMap.get(item.product_id)!

            const balanceBefore = parseFloat(product.current_stock ?? '0')
            const balanceAfter = balanceBefore + item.quantity

            await tx.insert(stockEntryItems).values({
                entry_id: newEntry.id,
                product_id: item.product_id,
                quantity: item.quantity.toFixed(3),
                unit_cost: item.unit_cost.toFixed(2),
                total_cost: (item.quantity * item.unit_cost).toFixed(2),
            })

            await tx.update(products)
                .set({ current_stock: balanceAfter.toFixed(3) })
                .where(eq(products.id, item.product_id))

            product.current_stock = balanceAfter.toFixed(3)

            await tx.insert(stockMovements).values({
                product_id: item.product_id,
                type: 'entry',
                quantity: item.quantity.toFixed(3),
                balance_before: balanceBefore.toFixed(3),
                balance_after: balanceAfter.toFixed(3),
                reference_id: newEntry.id,
                reference_type: 'stock_entry',
                notes: data.notes ?? null,
                created_by: userId,
            })
        }

        return newEntry
    })

    return entry
}

export const deleteStockEntry = async (id: string, userId: string) => {
    const entry = await getStockEntryById(id)
    if (!entry) throw new AppError('Entrada não encontrada', 404)

    await db.transaction(async (tx) => {
        for (const item of entry.items) {
            const quantity = parseFloat(item.quantity)

            const [product] = await tx.select().from(products).where(eq(products.id, item.product_id))
            if (!product) continue

            const balanceBefore = parseFloat(product.current_stock ?? '0')
            const balanceAfter = Math.max(0, balanceBefore - quantity)

            await tx.update(products)
                .set({ current_stock: balanceAfter.toFixed(3) })
                .where(eq(products.id, item.product_id))

            await tx.insert(stockMovements).values({
                product_id: item.product_id,
                type: 'entry',
                quantity: (-quantity).toFixed(3),
                balance_before: balanceBefore.toFixed(3),
                balance_after: balanceAfter.toFixed(3),
                reference_id: id,
                reference_type: 'entry_reversal',
                notes: `Estorno da entrada ${id}`,
                created_by: userId,
            })
        }

        await tx.delete(stockEntries).where(eq(stockEntries.id, id))
    })
}
