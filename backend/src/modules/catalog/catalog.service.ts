import { Prisma } from "@prisma/client";
import argon2 from "argon2";
import { getOrSetLocal, invalidate, invalidatePrefix } from "../../lib/cache.js";
import { AppError, isUniqueConstraintError, type LinkedRecordDetail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { computeNextDueDate, type RecurrenceKind } from "../../lib/recurrence.js";
import { unaccentSearchIds } from "../../lib/search.js";
import { createNoCostStockBatch } from "../stock/stock.service.js";
import type { CatalogResource } from "./catalog.schemas.js";

const linkedRecordChecks: Record<
    CatalogResource["delegate"],
    Array<{
        label: string;
        path: string;
        count: (id: string) => Promise<number>;
        query?: (record: { id: string; name?: string }) => Record<string, string>;
    }>
> = {
    quantityType: [
        {
            label: "lote(s) de estoque",
            path: "/dashboard/stock/batches",
            count: (id) => prisma.stockBatch.count({ where: { quantityTypeId: id } }),
        },
    ],
    product: [
        {
            label: "lote(s) de estoque",
            path: "/dashboard/stock/batches",
            count: (id) => prisma.stockBatch.count({ where: { productId: id } }),
            query: (record) => ({ productId: record.id, productName: record.name ?? "" }),
        },
        {
            label: "item(ns) de venda",
            path: "/dashboard/sales",
            count: (id) => prisma.saleItem.count({ where: { productId: id } }),
            query: (record) => ({ productId: record.id, productName: record.name ?? "" }),
        },
    ],
    debtor: [
        {
            label: "venda(s)",
            path: "/dashboard/sales",
            count: (id) => prisma.sale.count({ where: { debtorId: id } }),
        },
    ],
    expenseTemplate: [
        {
            label: "despesa(s)",
            path: "/dashboard/expenses",
            count: (id) => prisma.expense.count({ where: { expenseTemplateId: id } }),
        },
    ],
};

async function findLinkedRecords(
    resource: CatalogResource,
    record: { id: string; name?: string },
): Promise<LinkedRecordDetail[]> {
    const checks = linkedRecordChecks[resource.delegate];
    const counted = await Promise.all(
        checks.map(async (check) => ({
            label: check.label,
            path: check.path,
            count: await check.count(record.id),
            query: check.query?.(record),
        })),
    );
    return counted.filter((entry) => entry.count > 0);
}

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

function resolveExpenseTemplateSchedule(effective: { recurrence: string; anchorDate?: Date | null; status: string }): {
    anchorDate: Date | null;
    nextDueDate: Date | null;
} {
    if (effective.recurrence === "ONE_TIME") return { anchorDate: null, nextDueDate: null };
    if (!effective.anchorDate) throw new AppError(400, "anchorDate is required for recurring expense templates");
    if (effective.status !== "ACTIVE") return { anchorDate: effective.anchorDate, nextDueDate: null };
    return {
        anchorDate: effective.anchorDate,
        nextDueDate: computeNextDueDate(effective.anchorDate, effective.recurrence as RecurrenceKind, new Date()),
    };
}

function resolveProductPricing(effective: { type: string; priceSell?: number }): { priceSell: number | null } {
    if (effective.type === "RAW_MATERIAL") return { priceSell: null };
    if (effective.priceSell === undefined)
        throw new AppError(400, "priceSell is required unless the product is a raw material");
    return { priceSell: effective.priceSell };
}

export const catalogService = {
    list: async (
        resource: CatalogResource,
        where: unknown,
        skip: number,
        take: number,
        stockOrder?: "asc" | "desc",
        search?: string,
    ): Promise<[Array<{ id: string }>, number]> =>
        getOrSetLocal(
            `catalog:${resource.delegate}:list:${JSON.stringify({ where, skip, take, stockOrder, search })}`,
            60,
            async () => {
                const searchIds = search ? await unaccentSearchIds(resource.table, ["name"], search) : undefined;
                if (searchIds && searchIds.length === 0) return [[], 0];
                const effectiveWhere = searchIds ? { ...(where as object), id: { in: searchIds } } : where;
                if (resource.delegate === "product") {
                    if (stockOrder) {
                        const productWhere = effectiveWhere as Prisma.ProductWhereInput;
                        const status = typeof productWhere.status === "string" ? productWhere.status : undefined;
                        const excludesArchived =
                            typeof productWhere.status === "object" && productWhere.status?.not === "ARCHIVED";
                        const type = typeof productWhere.type === "string" ? productWhere.type : undefined;
                        const typeNot =
                            typeof productWhere.type === "object" && productWhere.type && "not" in productWhere.type
                                ? productWhere.type.not
                                : undefined;
                        const filters = [
                            status ? Prisma.sql`p."status" = ${status}::"EntityStatus"` : undefined,
                            excludesArchived ? Prisma.sql`p."status" != 'ARCHIVED'::"EntityStatus"` : undefined,
                            searchIds ? Prisma.sql`p.id IN (${Prisma.join(searchIds)})` : undefined,
                            type ? Prisma.sql`p."type" = ${type}::"ProductType"` : undefined,
                            typeNot ? Prisma.sql`p."type" != ${typeNot}::"ProductType"` : undefined,
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
                            where: effectiveWhere as Prisma.ProductWhereInput,
                            orderBy: [{ name: "asc" }, { id: "asc" }],
                            skip,
                            take,
                        }),
                        prisma.product.count({ where: effectiveWhere as Prisma.ProductWhereInput }),
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
                        where: effectiveWhere,
                        orderBy:
                            resource.delegate === "debtor"
                                ? [{ name: "asc" }, { id: "asc" }]
                                : [{ createdAt: "desc" }, { id: "desc" }],
                        skip,
                        take,
                    }),
                    db[resource.delegate].count({ where: effectiveWhere }),
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
        let initialQuantity: number | undefined;
        let initialQuantityTypeId: string | undefined;
        if (resource.delegate === "product") {
            const {
                initialQuantity: quantity,
                initialQuantityTypeId: quantityTypeId,
                ...productData
            } = data as {
                initialQuantity?: number;
                initialQuantityTypeId?: string;
            } & Record<string, unknown>;
            if ((quantity === undefined) !== (quantityTypeId === undefined))
                throw new AppError(400, "initialQuantity and initialQuantityTypeId must be provided together");
            initialQuantity = quantity;
            initialQuantityTypeId = quantityTypeId;
            payload = {
                ...productData,
                ...resolveProductPricing({
                    type: (productData.type as string) ?? "BOTH",
                    priceSell: productData.priceSell as number | undefined,
                }),
            };
        }
        let item: { id: string };
        try {
            item =
                initialQuantity !== undefined && initialQuantityTypeId !== undefined
                    ? await prisma.$transaction(async (tx) => {
                          const product = await tx.product.create({
                              data: { ...payload, createdUserId: userId } as Prisma.ProductUncheckedCreateInput,
                          });
                          await createNoCostStockBatch(
                              tx,
                              {
                                  productId: product.id,
                                  quantityTypeId: initialQuantityTypeId as string,
                                  quantity: initialQuantity as number,
                              },
                              userId,
                          );
                          return product;
                      })
                    : await db[resource.delegate].create({ data: { ...payload, createdUserId: userId } });
        } catch (error) {
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, `${resource.label} already exists`);
            throw error;
        }
        await audit(resource.delegate, item.id, "CREATE", userId, item);
        await invalidatePrefix(`catalog:${resource.delegate}:`);
        await invalidatePrefix("stock:");
        await invalidatePrefix("reports:");
        if (initialQuantity !== undefined) await invalidate("dashboard");
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
        if (resource.delegate === "product") {
            const prev = previous as unknown as { type: string; priceSell: unknown };
            const {
                initialQuantity: _initialQuantity,
                initialQuantityTypeId: _initialQuantityTypeId,
                ...productData
            } = data as { initialQuantity?: number; initialQuantityTypeId?: string } & Record<string, unknown>;
            payload = {
                ...productData,
                ...resolveProductPricing({
                    type: (productData.type as string) ?? prev.type,
                    priceSell:
                        (productData.priceSell as number | undefined) ??
                        (prev.priceSell == null ? undefined : Number(prev.priceSell)),
                }),
            };
        }
        let item: { id: string };
        try {
            item = await db[resource.delegate].update({ where: { id }, data: payload });
        } catch (error) {
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, `${resource.label} already exists`);
            throw error;
        }
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
        const linkedRecords = await findLinkedRecords(resource, previous as { id: string; name?: string });
        if (linkedRecords.length)
            throw new AppError(409, "Resource cannot be deleted because it has linked records", linkedRecords);
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
        let user: { id: string };
        try {
            user = await prisma.user.create({
                data: { ...userData, passwordHash: await argon2.hash(password), createdUserId: userId } as never,
                omit: { passwordHash: true },
            });
        } catch (error) {
            if (isUniqueConstraintError(error, "username")) throw new AppError(409, "Username already exists");
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, "User already exists");
            throw error;
        }
        await audit("user", user.id, "CREATE", userId, user);
        return user;
    },
};
