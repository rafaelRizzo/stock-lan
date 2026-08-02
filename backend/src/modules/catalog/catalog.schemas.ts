import { z } from "zod";
import { MAX_MONEY } from "../../lib/decimal-limits.js";
import { paginationSchema } from "../../lib/pagination.js";

export const entityStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const idParamsSchema = z.object({ id: z.string().cuid() });
export const catalogListSchema = paginationSchema.extend({
    search: z.string().trim().max(120).optional(),
    status: entityStatusSchema.optional(),
    includeArchived: z.coerce.boolean().optional(),
    stockOrder: z.enum(["asc", "desc"]).optional(),
});

export const catalogResources = [
    {
        path: "quantity-types",
        delegate: "quantityType",
        schema: z.object({ name: z.string().trim().min(1).max(80), status: entityStatusSchema.optional() }),
    },
    {
        path: "products",
        delegate: "product",
        schema: z.object({
            name: z.string().trim().min(1).max(160),
            priceSell: z.coerce.number().positive().max(MAX_MONEY).optional(),
            type: z.enum(["RAW_MATERIAL", "FINISHED", "BOTH"]).default("BOTH"),
            obs: z.string().trim().max(2000).optional(),
            status: entityStatusSchema.optional(),
        }),
    },
    {
        path: "debtors",
        delegate: "debtor",
        schema: z.object({
            name: z.string().trim().min(1).max(160),
            phone: z.string().trim().max(30).optional(),
            obs: z.string().trim().max(2000).optional(),
            status: entityStatusSchema.optional(),
        }),
    },
    {
        path: "expense-templates",
        delegate: "expenseTemplate",
        schema: z.object({
            name: z.string().trim().min(1).max(160),
            recurrence: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY", "YEARLY"]),
            defaultValue: z.coerce.number().positive().max(MAX_MONEY),
            anchorDate: z.coerce.date().optional(),
            obs: z.string().trim().max(2000).optional(),
            status: entityStatusSchema.optional(),
        }),
    },
] as const;

export const userSchema = z.object({
    name: z.string().trim().min(1).max(160),
    username: z.string().trim().min(3).max(80),
    password: z.string().min(12).max(256),
    role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]).default("OPERATOR"),
    photo: z.string().url().optional(),
    obs: z.string().trim().max(2000).optional(),
    status: entityStatusSchema.optional(),
});
export type CatalogResource = (typeof catalogResources)[number];
