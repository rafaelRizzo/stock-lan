import { z } from "zod";

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginate<T>(data: T[], total: number, { page, limit }: Pagination) {
    return {
        data,
        total,
        totalPage: Math.ceil(total / limit),
        page,
        limit,
    };
}

export function getSkip({ page, limit }: Pagination) {
    return (page - 1) * limit;
}
