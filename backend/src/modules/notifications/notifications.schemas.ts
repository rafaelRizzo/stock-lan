import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const notificationsListSchema = paginationSchema;
export const notificationParamsSchema = z.object({ id: z.string().cuid() });
