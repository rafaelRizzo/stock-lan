import { db } from '../../db/config/db'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { stockMovements } from '../../db/schemas/stockMovements'
import type { StockMovementFilters } from './schemas/stockMovements.schemas'

export const getStockMovements = async (filters: StockMovementFilters) => {
    const { product_id, type, start_date, end_date, utc_offset, limit, offset } = filters

    const result = await db
        .select()
        .from(stockMovements)
        .where(and(
            product_id ? eq(stockMovements.product_id, product_id) : undefined,
            type ? eq(stockMovements.type, type) : undefined,
            start_date ? gte(stockMovements.created_at, new Date(`${start_date}T00:00:00.000${utc_offset}`)) : undefined,
            end_date ? lte(stockMovements.created_at, new Date(`${end_date}T23:59:59.999${utc_offset}`)) : undefined,
        ))
        .orderBy(desc(stockMovements.created_at))
        .limit(limit)
        .offset(offset)

    return result
}
