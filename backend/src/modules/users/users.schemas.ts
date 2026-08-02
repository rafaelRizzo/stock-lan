import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const userSchema = z.object({
    name: z.string().trim().min(1).max(160),
    username: z.string().trim().min(3).max(80),
    password: z.string().min(12).max(256),
    role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]).optional(),
    photo: z.string().url().optional(),
    obs: z.string().trim().max(2000).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
export const userParamsSchema = z.object({ id: z.string().cuid() });
export const usersListSchema = paginationSchema.extend({
    search: z.string().trim().max(120).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
