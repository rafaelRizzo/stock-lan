import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { getOrSetLocal, invalidatePrefix } from "../../lib/cache.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { computeNextDueDate, type RecurrenceKind } from "../../lib/recurrence.js";
import type { CatalogResource } from "./catalog.schemas.js";

type CrudDelegate = {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    count: (args: unknown) => Promise<number>;
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<{ id: string }>;
    update: (args: unknown) => Promise<{ id: string }>;
    delete: (args: unknown) => Promise<{ id: string }>;
};
const db = prisma as unknown as Record<CatalogResource["delegate"], CrudDelegate>;

async function audit(
    entity: string,
    entityId: string,
    action: string,
    actorId: string,
    current: unknown,
    previous?: unknown,
) {
    await prisma.audit.create({
        data: {
            entity,
            entityId,
            action,
            actorId,
            createdUserId: actorId,
            current: current as object,
            previous: previous as object | undefined,
        },
    });
}

function resolveExpenseTemplateSchedule(effective: {
    recurrence: string;
    anchorDate?: Date | null;
    status: string;
}): { anchorDate: Date | null; nextDueDate: Date | null } {
    if (effective.recurrence === "ONE_TIME") return { anchorDate: null, nextDueDate: null };
    if (!effective.anchorDate) throw new AppError(400, "anchorDate is required for recurring expense templates");
    if (effective.status !== "ACTIVE") return { anchorDate: effective.anchorDate, nextDueDate: null };
    return {
        anchorDate: effective.anchorDate,
        nextDueDate: computeNextDueDate(effective.anchorDate, effective.recurrence as RecurrenceKind, new Date()),
    };
}

export const catalogService = {
    list: async (
        resource: CatalogResource,
        where: unknown,
        skip: number,
        take: number,
        stockOrder?: "asc" | "desc",
    ): Promise<[Array<{ id: string }>, number]> =>
        getOrSetLocal(
            `catalog:${resource.delegate}:list:${JSON.stringify({ where, skip, take, stockOrder })}`,
            60,
            async () => {
                if (resource.delegate === "product") {
                    if (stockOrder) {
                        const productWhere = where as Prisma.ProductWhereInput;
                        const status = typeof productWhere.status === "string" ? productWhere.status : undefined;
                        const excludesArchived =
                            typeof productWhere.status === "object" && productWhere.status?.not === "ARCHIVED";
                        const search =
                            typeof productWhere.name === "object" && "contains" in productWhere.name
                                ? productWhere.name.contains
                                : undefined;
                        const filters = [
                            status ? Prisma.sql`p."status" = ${status}::"EntityStatus"` : undefined,
                            excludesArchived ? Prisma.sql`p."status" != 'ARCHIVED'::"EntityStatus"` : undefined,
                            search ? Prisma.sql`p."name" ILIKE ${`%${search}%`}` : undefined,
                        ].filter((filter): filter is Prisma.Sql => Boolean(filter));
                        const whereClause = filters.length
                            ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
                            : Prisma.empty;
                        const direction = stockOrder === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
                        const [products, total] = await Promise.all([
                            prisma.$queryRaw<Array<{ id: string }>>`
                            SELECT p.*, COALESCE(SUM(sb."quantityLeft"), 0) AS "stockQuantity"
                            FROM "Product" p
                            LEFT JOIN "StockBatch" sb
                                ON sb."productId" = p.id
                                AND sb."status" = 'ACTIVE'::"EntityStatus"
                            ${whereClause}
                            GROUP BY p.id
                            ORDER BY "stockQuantity" ${direction}, p."createdAt" DESC, p.id DESC
                            LIMIT ${take} OFFSET ${skip}
                        `,
                            prisma.product.count({ where: productWhere }),
                        ]);
                        return [products, total];
                    }
                    const [products, total] = await Promise.all([
                        prisma.product.findMany({
                            where: where as Prisma.ProductWhereInput,
                            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                            skip,
                            take,
                        }),
                        prisma.product.count({ where: where as Prisma.ProductWhereInput }),
                    ]);
                    const balances = products.length
                        ? await prisma.stockBatch.groupBy({
                              by: ["productId"],
                              where: { productId: { in: products.map((product) => product.id) }, status: "ACTIVE" },
                              _sum: { quantityLeft: true },
                          })
                        : [];
                    const quantityByProductId = new Map(
                        balances.map((balance) => [
                            balance.productId,
                            balance._sum.quantityLeft ?? new Prisma.Decimal(0),
                        ]),
                    );
                    return [
                        products.map((product) => ({
                            ...product,
                            stockQuantity: quantityByProductId.get(product.id) ?? new Prisma.Decimal(0),
                        })),
                        total,
                    ];
                }
                return Promise.all([
                    db[resource.delegate].findMany({
                        where,
                        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                        skip,
                        take,
                    }),
                    db[resource.delegate].count({ where }),
                ]);
            },
        ),
    get: async (resource: CatalogResource, id: string) =>
        getOrSetLocal(`catalog:${resource.delegate}:id:${id}`, 60, async () => {
            const item = await db[resource.delegate].findFirst({ where: { id, status: { not: "ARCHIVED" } } });
            if (!item) throw new AppError(404, "Resource not found");
            return item;
        }),
    create: async (resource: CatalogResource, data: Record<string, unknown>, userId: string) => {
        let payload = data;
        if (resource.delegate === "expenseTemplate") {
            payload = {
                ...data,
                ...resolveExpenseTemplateSchedule({
                    recurrence: data.recurrence as string,
                    anchorDate: data.anchorDate as Date | undefined,
                    status: (data.status as string) ?? "ACTIVE",
                }),
            };
        }
        const item = await db[resource.delegate].create({ data: { ...payload, createdUserId: userId } });
        await audit(resource.delegate, item.id, "CREATE", userId, item);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        return item;
    },
    update: async (resource: CatalogResource, id: string, data: Record<string, unknown>, userId: string) => {
        const previous = await db[resource.delegate].findUnique({ where: { id } });
        if (!previous) throw new AppError(404, "Resource not found");
        let payload = data;
        if (resource.delegate === "expenseTemplate") {
            const prev = previous as unknown as { recurrence: string; anchorDate: Date | null; status: string };
            payload = {
                ...data,
                ...resolveExpenseTemplateSchedule({
                    recurrence: (data.recurrence as string) ?? prev.recurrence,
                    anchorDate: (data.anchorDate as Date | undefined) ?? prev.anchorDate ?? undefined,
                    status: (data.status as string) ?? prev.status,
                }),
            };
        }
        const item = await db[resource.delegate].update({ where: { id }, data: payload });
        await audit(resource.delegate, id, "UPDATE", userId, item, previous);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        return item;
    },
    archive: async (resource: CatalogResource, id: string, userId: string) => {
        const previous = await db[resource.delegate].findUnique({ where: { id } });
        if (!previous) throw new AppError(404, "Resource not found");
        const item = await db[resource.delegate].update({ where: { id }, data: { status: "ARCHIVED" } });
        await audit(resource.delegate, id, "ARCHIVE", userId, item, previous);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
    },
    restore: async (resource: CatalogResource, id: string, userId: string) => {
        const previous = await db[resource.delegate].findUnique({ where: { id } });
        if (!previous) throw new AppError(404, "Resource not found");
        let data: Record<string, unknown> = { status: "ACTIVE" };
        if (resource.delegate === "expenseTemplate") {
            const prev = previous as unknown as { recurrence: string; anchorDate: Date | null };
            data = {
                ...data,
                ...resolveExpenseTemplateSchedule({
                    recurrence: prev.recurrence,
                    anchorDate: prev.anchorDate ?? undefined,
                    status: "ACTIVE",
                }),
            };
        }
        const item = await db[resource.delegate].update({ where: { id }, data });
        await audit(resource.delegate, id, "RESTORE", userId, item, previous);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
    },
    permanentDelete: async (resource: CatalogResource, id: string, userId: string) => {
        const previous = await db[resource.delegate].findUnique({ where: { id } });
        if (!previous) throw new AppError(404, "Resource not found");
        try {
            await db[resource.delegate].delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
                throw new AppError(409, "Resource cannot be deleted because it has linked records");
            throw error;
        }
        await audit(resource.delegate, id, "DELETE", userId, { id }, previous);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
    },
    createUser: async (data: { password: string; [key: string]: unknown }, userId: string) => {
        const { password, ...userData } = data;
        const user = await prisma.user.create({
            data: { ...userData, passwordHash: await argon2.hash(password), createdUserId: userId } as never,
            omit: { passwordHash: true },
        });
        await audit("user", user.id, "CREATE", userId, user);
        return user;
    },
};
