import { pgTable, uuid, timestamp, varchar, text, numeric } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { suppliers } from './suppliers'
import { products } from './products'
import { users } from './users'

export const stockEntries = pgTable('stock_entries', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    supplier_id: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),

    invoice_number: varchar('invoice_number', { length: 100 }),

    notes: text('notes'),

    total_value: numeric('total_value', { precision: 12, scale: 2 }).notNull().default('0'),

    entry_date: timestamp('entry_date', { withTimezone: true }).notNull().defaultNow(),

    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const stockEntryItems = pgTable('stock_entry_items', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    entry_id: uuid('entry_id').notNull().references(() => stockEntries.id, { onDelete: 'cascade' }),

    product_id: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),

    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),

    unit_cost: numeric('unit_cost', { precision: 10, scale: 2 }).notNull(),

    total_cost: numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
})
