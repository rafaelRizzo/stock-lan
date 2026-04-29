import { pgTable, uuid, timestamp, varchar, text, boolean, numeric, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { categories } from './categories'
import { units } from './units'

export const products = pgTable('products', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    code: varchar('code', { length: 100 }),

    name: varchar('name', { length: 255 }).notNull(),

    description: text('description'),

    category_id: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

    unit_id: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),

    cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),

    sale_price: numeric('sale_price', { precision: 10, scale: 2 }).notNull().default('0'),

    current_stock: numeric('current_stock', { precision: 10, scale: 3 }).notNull().default('0'),

    min_stock: numeric('min_stock', { precision: 10, scale: 3 }).notNull().default('0'),

    status: boolean('status').notNull().default(true),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex('products_code_unique_idx').on(table.code).where(sql`${table.code} IS NOT NULL`),
])
