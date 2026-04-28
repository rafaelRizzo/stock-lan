import { pgTable, uuid, timestamp, varchar, boolean } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const suppliers = pgTable('suppliers', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    name: varchar('name', { length: 255 }).notNull(),

    phone: varchar('phone', { length: 20 }),

    status: boolean('status').notNull().default(true),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
})
