import { db } from '../../db/config/db'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import { AppError } from '../../utils/handlers/app.error'
import { debtors } from '../../db/schemas/debtors'
import { stockExits, stockExitItems } from '../../db/schemas/stockExits'
import { products } from '../../db/schemas/products'
import type { CreateDebtorInput, UpdateDebtorInput, DebtorSummaryQuery } from './schemas/debtors.schemas'

export const getAllDebtors = async (limit = 50, offset = 0, status?: string) => {
    const conditions = []
    if (status !== undefined) {
        conditions.push(eq(debtors.status, status === 'true'))
    }

    const rows = await db
        .select({
            id: debtors.id,
            name: debtors.name,
            phone: debtors.phone,
            notes: debtors.notes,
            status: debtors.status,
            created_at: debtors.created_at,
            updated_at: debtors.updated_at,
            total_debt: sql<string>`
                COALESCE(SUM(
                    CASE WHEN ${stockExits.payment_status} IN ('pending', 'partial')
                    THEN ${stockExits.total_value}::numeric ELSE 0 END
                ), 0)::text`,
            total_exits: sql<number>`COUNT(${stockExits.id})::int`,
        })
        .from(debtors)
        .leftJoin(stockExits, eq(stockExits.debtor_id, debtors.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(debtors.id)
        .orderBy(desc(debtors.created_at))
        .limit(limit)
        .offset(offset)

    return rows
}

export const getDebtorById = async (id: string) => {
    const [debtor] = await db.select().from(debtors).where(eq(debtors.id, id))
    return debtor ?? null
}

export const getDebtorSummary = async (id: string, query: DebtorSummaryQuery) => {
    const [debtor] = await db.select().from(debtors).where(eq(debtors.id, id))
    if (!debtor) return null

    const dateConditions = []
    if (query.start_date) {
        dateConditions.push(sql`${stockExits.exit_date} >= ${query.start_date}::date`)
    }
    if (query.end_date) {
        dateConditions.push(sql`${stockExits.exit_date} < (${query.end_date}::date + interval '1 day')`)
    }

    const baseWhere = and(eq(stockExits.debtor_id, id), ...dateConditions)

    const [totals] = await db
        .select({
            total_debt: sql<string>`
                COALESCE(SUM(
                    CASE WHEN ${stockExits.payment_status} IN ('pending', 'partial')
                    THEN ${stockExits.total_value}::numeric ELSE 0 END
                ), 0)::text`,
            total_paid: sql<string>`
                COALESCE(SUM(
                    CASE WHEN ${stockExits.payment_status} = 'paid'
                    THEN ${stockExits.total_value}::numeric ELSE 0 END
                ), 0)::text`,
            total_exits: sql<number>`COUNT(${stockExits.id})::int`,
        })
        .from(stockExits)
        .where(baseWhere)

    const exits = await db
        .select()
        .from(stockExits)
        .where(baseWhere)
        .orderBy(desc(stockExits.exit_date))

    const exitIds = exits.map(e => e.id)

    const itemRows = exitIds.length
        ? await db
            .select({
                exit_id: stockExitItems.exit_id,
                item_id: stockExitItems.id,
                quantity: stockExitItems.quantity,
                unit_price: stockExitItems.unit_price,
                total_price: stockExitItems.total_price,
                product_id: products.id,
                product_name: products.name,
                product_code: products.code,
            })
            .from(stockExitItems)
            .innerJoin(products, eq(products.id, stockExitItems.product_id))
            .where(inArray(stockExitItems.exit_id, exitIds))
        : []

    const itemsByExit = new Map<string, typeof itemRows>()
    for (const item of itemRows) {
        const list = itemsByExit.get(item.exit_id) ?? []
        list.push(item)
        itemsByExit.set(item.exit_id, list)
    }

    const exitsWithItems = exits.map(e => ({ ...e, items: itemsByExit.get(e.id) ?? [] }))

    return {
        ...debtor,
        pending_exits: exitsWithItems.filter(e => e.payment_status === 'pending' || e.payment_status === 'partial'),
        paid_exits: exitsWithItems.filter(e => e.payment_status === 'paid'),
        summary: {
            total_exits: totals?.total_exits ?? 0,
            total_debt: totals?.total_debt ?? '0',
            total_paid: totals?.total_paid ?? '0',
        },
    }
}

export const createDebtor = async (data: CreateDebtorInput) => {
    const [debtor] = await db.insert(debtors).values({
        name: data.name,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
    }).returning()

    if (!debtor) throw new AppError('Falha ao criar devedor', 500)
    return debtor
}

export const updateDebtor = async (id: string, data: UpdateDebtorInput) => {
    const [updated] = await db.update(debtors).set(data).where(eq(debtors.id, id)).returning()
    if (!updated) throw new AppError('Devedor não encontrado', 404)
    return updated
}

export const deleteDebtor = async (id: string) => {
    const pendingExits = await db
        .select({ id: stockExits.id })
        .from(stockExits)
        .where(
            and(
                eq(stockExits.debtor_id, id),
                inArray(stockExits.payment_status, ['pending', 'partial'])
            )
        )
        .limit(1)

    if (pendingExits.length > 0) {
        throw new AppError('Não é possível excluir devedor com saídas pendentes', 409)
    }

    const [deleted] = await db.delete(debtors).where(eq(debtors.id, id)).returning()
    if (!deleted) throw new AppError('Devedor não encontrado', 404)
    return deleted
}
