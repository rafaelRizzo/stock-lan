import { pgTable, uuid, timestamp, varchar, text, boolean } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    name: varchar('name', { length: 255 }).notNull().unique(),

    description: text('description'),

    status: boolean('status').notNull().default(true),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
})
