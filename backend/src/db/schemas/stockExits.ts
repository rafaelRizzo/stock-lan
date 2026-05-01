import { pgTable, uuid, timestamp, varchar, text, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { products } from './products'
import { users } from './users'
import { debtors } from './debtors'

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'partial', 'cancelled'])

export const stockExits = pgTable('stock_exits', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    reason: varchar('reason', { length: 255 }).notNull(),

    destination: varchar('destination', { length: 255 }),

    notes: text('notes'),

    total_value: numeric('total_value', { precision: 12, scale: 2 }).notNull().default('0'),

    payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),

    debtor_id: uuid('debtor_id').references(() => debtors.id, { onDelete: 'set null' }),

    paid_at: timestamp('paid_at', { withTimezone: true }),

    exit_date: timestamp('exit_date', { withTimezone: true }).notNull().defaultNow(),

    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const stockExitItems = pgTable('stock_exit_items', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    exit_id: uuid('exit_id').notNull().references(() => stockExits.id, { onDelete: 'cascade' }),

    product_id: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),

    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),

    unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),

    total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
})
