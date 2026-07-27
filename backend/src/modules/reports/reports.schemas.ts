import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const debtsReportQuerySchema = paginationSchema;

export const dashboardReportQuerySchema = z
    .object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
    })
    .refine((value) => Boolean(value.startDate) === Boolean(value.endDate), {
        message: "startDate and endDate must be provided together",
    })
    .refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
        message: "startDate must be before or equal to endDate",
    })
    .refine(
        (value) =>
            !value.startDate ||
            !value.endDate ||
            value.endDate.getTime() - value.startDate.getTime() <= 366 * 24 * 60 * 60 * 1000,
        { message: "The date range cannot exceed 366 days" },
    );
