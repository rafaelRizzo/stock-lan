import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const notificationsService = {
    list: async (userId: string, skip: number, take: number) => {
        const [data, total] = await Promise.all([
            prisma.notification.findMany({
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip,
                take,
                include: { reads: { where: { userId } } },
            }),
            prisma.notification.count(),
        ]);
        return {
            data: data.map(({ reads, ...notification }) => ({ ...notification, read: reads.length > 0 })),
            total,
        };
    },
    unreadCount: (userId: string) => prisma.notification.count({ where: { reads: { none: { userId } } } }),
    markRead: async (id: string, userId: string) => {
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) throw new AppError(404, "Notification not found");
        await prisma.notificationRead.upsert({
            where: { notificationId_userId: { notificationId: id, userId } },
            create: { notificationId: id, userId },
            update: {},
        });
    },
    markAllRead: async (userId: string) => {
        const unread = await prisma.notification.findMany({
            where: { reads: { none: { userId } } },
            select: { id: true },
        });
        if (!unread.length) return;
        await prisma.notificationRead.createMany({
            data: unread.map((notification) => ({ notificationId: notification.id, userId })),
            skipDuplicates: true,
        });
    },
    delete: async (id: string) => {
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) throw new AppError(404, "Notification not found");
        await prisma.notification.delete({ where: { id } });
    },
};
