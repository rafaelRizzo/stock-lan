import { db } from '../../db/config/db'
import { desc, eq, inArray, and } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { products } from '../../db/schemas/products'
import { stockExits, stockExitItems } from '../../db/schemas/stockExits'
import { stockMovements } from '../../db/schemas/stockMovements'
import type { CreateStockExitInput, UpdatePaymentStatusInput, PaymentStatus } from './schemas/stockExits.schemas'

export const getAllStockExits = async (limit = 50, offset = 0, paymentStatus?: string, debtorId?: string) => {
    const conditions = []

    const statusList = paymentStatus
        ? (paymentStatus.split(',').map(s => s.trim()).filter(Boolean) as PaymentStatus[])
        : undefined

    if (statusList?.length) conditions.push(inArray(stockExits.payment_status, statusList))
    if (debtorId) conditions.push(eq(stockExits.debtor_id, debtorId))

    const exits = await db.select().from(stockExits)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(stockExits.created_at))
        .limit(limit)
        .offset(offset)

    if (!exits.length) return []

    const exitIds = exits.map(e => e.id)
    const allItems = await db.select().from(stockExitItems).where(inArray(stockExitItems.exit_id, exitIds))

    const itemsByExit = new Map<string, typeof allItems>()
    for (const item of allItems) {
        const list = itemsByExit.get(item.exit_id) ?? []
        list.push(item)
        itemsByExit.set(item.exit_id, list)
    }

    return exits.map(e => ({ ...e, items: itemsByExit.get(e.id) ?? [] }))
}

export const getStockExitById = async (id: string) => {
    const [exit] = await db.select().from(stockExits).where(eq(stockExits.id, id))
    if (!exit) return null

    const items = await db.select().from(stockExitItems).where(eq(stockExitItems.exit_id, id))
    return { ...exit, items }
}

export const createStockExit = async (data: CreateStockExitInput, userId: string) => {
    const uniqueProductIds = [...new Set(data.items.map(i => i.product_id))]

    const foundProducts = await db.select().from(products).where(inArray(products.id, uniqueProductIds))
    if (foundProducts.length !== uniqueProductIds.length) {
        throw new AppError('Um ou mais produtos não encontrados', 404)
    }

    const productMap = new Map(foundProducts.map(p => [p.id, p]))

    const runningBalance = new Map(foundProducts.map(p => [p.id, parseFloat(p.current_stock ?? '0')]))

    for (const item of data.items) {
        const product = productMap.get(item.product_id)!
        const available = runningBalance.get(item.product_id)!
        if (item.quantity > available) {
            throw new AppError(
                `Estoque insuficiente para o produto "${product.name}". Disponível: ${available}, solicitado: ${item.quantity}`,
                422
            )
        }
        runningBalance.set(item.product_id, available - item.quantity)
    }

    const totalValue = data.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

    const txBalance = new Map(foundProducts.map(p => [p.id, parseFloat(p.current_stock ?? '0')]))

    const exit = await db.transaction(async (tx) => {
        const [newExit] = await tx.insert(stockExits).values({
            reason: data.reason,
            destination: data.destination ?? null,
            notes: data.notes ?? null,
            total_value: totalValue.toFixed(2),
            payment_status: data.payment_status ?? 'pending',
            debtor_id: data.debtor_id ?? null,
            paid_at: data.paid_at ? new Date(data.paid_at) : (data.payment_status === 'paid' ? new Date() : null),
            exit_date: data.exit_date ? new Date(data.exit_date) : new Date(),
            created_by: userId,
        }).returning()

        if (!newExit) throw new AppError('Falha ao registrar saída', 500)

        for (const item of data.items) {
            const balanceBefore = txBalance.get(item.product_id)!
            const balanceAfter = balanceBefore - item.quantity
            txBalance.set(item.product_id, balanceAfter)

            await tx.insert(stockExitItems).values({
                exit_id: newExit.id,
                product_id: item.product_id,
                quantity: item.quantity.toFixed(3),
                unit_price: item.unit_price.toFixed(2),
                total_price: (item.quantity * item.unit_price).toFixed(2),
            })

            await tx.update(products)
                .set({ current_stock: balanceAfter.toFixed(3) })
                .where(eq(products.id, item.product_id))

            await tx.insert(stockMovements).values({
                product_id: item.product_id,
                type: 'exit',
                quantity: item.quantity.toFixed(3),
                balance_before: balanceBefore.toFixed(3),
                balance_after: balanceAfter.toFixed(3),
                reference_id: newExit.id,
                reference_type: 'stock_exit',
                notes: data.notes ?? null,
                created_by: userId,
            })
        }

        return newExit
    })

    return exit
}

export const updatePaymentStatus = async (id: string, data: UpdatePaymentStatusInput) => {
    const [exit] = await db.select().from(stockExits).where(eq(stockExits.id, id))
    if (!exit) throw new AppError('Saída não encontrada', 404)

    const paidAt = data.paid_at
        ? new Date(data.paid_at)
        : data.payment_status === 'paid' ? new Date() : null

    const [updated] = await db.update(stockExits)
        .set({
            payment_status: data.payment_status,
            paid_at: paidAt,
        })
        .where(eq(stockExits.id, id))
        .returning()

    return updated
}

export const deleteStockExit = async (id: string, userId: string) => {
    const exit = await getStockExitById(id)
    if (!exit) throw new AppError('Saída não encontrada', 404)

    await db.transaction(async (tx) => {
        for (const item of exit.items) {
            const quantity = parseFloat(item.quantity)

            const [product] = await tx.select().from(products).where(eq(products.id, item.product_id))
            if (!product) continue

            const balanceBefore = parseFloat(product.current_stock ?? '0')
            const balanceAfter = balanceBefore + quantity

            await tx.update(products)
                .set({ current_stock: balanceAfter.toFixed(3) })
                .where(eq(products.id, item.product_id))

            await tx.insert(stockMovements).values({
                product_id: item.product_id,
                type: 'entry',
                quantity: quantity.toFixed(3),
                balance_before: balanceBefore.toFixed(3),
                balance_after: balanceAfter.toFixed(3),
                reference_id: id,
                reference_type: 'exit_reversal',
                notes: `Estorno da saída ${id}`,
                created_by: userId,
            })
        }

        await tx.delete(stockExits).where(eq(stockExits.id, id))
    })
}
