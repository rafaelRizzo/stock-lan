import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Resolves row ids whose given columns match `search` ignoring case and accents (requires the `unaccent` Postgres extension). */
export async function unaccentSearchIds(table: string, columns: string[], search: string): Promise<string[]> {
    const conditions = columns.map(
        (column) => Prisma.sql`unaccent(${Prisma.raw(`"${column}"`)}) ILIKE unaccent(${`%${search}%`})`,
    );
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE ${Prisma.join(conditions, " OR ")}`,
    );
    return rows.map((row) => row.id);
}
