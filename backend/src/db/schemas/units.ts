import { pgTable, uuid, timestamp, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const units = pgTable('units', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    name: varchar('name', { length: 100 }).notNull().unique(),

    abbreviation: varchar('abbreviation', { length: 20 }).notNull().unique(),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
})
