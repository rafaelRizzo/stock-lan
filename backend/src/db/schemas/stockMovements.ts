import { pgTable, uuid, timestamp, varchar, text, numeric } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { products } from './products'
import { users } from './users'

export const stockMovements = pgTable('stock_movements', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    product_id: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),

    type: varchar('type', { length: 10 }).notNull(), // 'entry' | 'exit'

    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),

    balance_before: numeric('balance_before', { precision: 10, scale: 3 }).notNull(),

    balance_after: numeric('balance_after', { precision: 10, scale: 3 }).notNull(),

    reference_id: uuid('reference_id').notNull(),

    reference_type: varchar('reference_type', { length: 20 }).notNull(), // 'stock_entry' | 'stock_exit'

    notes: text('notes'),

    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
