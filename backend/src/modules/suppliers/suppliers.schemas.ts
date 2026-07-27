import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const supplierStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const supplierSchema = z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(30).optional(),
    obs: z.string().trim().max(2000).optional(),
    status: supplierStatusSchema.optional(),
});
export const supplierParamsSchema = z.object({ id: z.string().cuid() });
export const suppliersListSchema = paginationSchema.extend({
    search: z.string().trim().max(120).optional(),
    status: supplierStatusSchema.optional(),
    includeArchived: z.coerce.boolean().optional(),
});
