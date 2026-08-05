import argon2 from "argon2";
import { AppError, isUniqueConstraintError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const usersService = {
    list: async (
        search: string | undefined,
        status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | undefined,
        skip: number,
        take: number,
    ) => {
        const where = {
            ...(status ? { status } : {}),
            ...(search
                ? {
                      OR: [
                          { name: { contains: search, mode: "insensitive" as const } },
                          { username: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };
        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where,
                omit: { passwordHash: true },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip,
                take,
            }),
            prisma.user.count({ where }),
        ]);
        return { data, total };
    },
    create: async (input: { password: string; [key: string]: unknown }, createdUserId: string) => {
        const { password, ...data } = input;
        try {
            return await prisma.user.create({
                data: { ...data, passwordHash: await argon2.hash(password), createdUserId } as never,
                omit: { passwordHash: true },
            });
        } catch (error) {
            if (isUniqueConstraintError(error, "username")) throw new AppError(409, "Username already exists");
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, "User already exists");
            throw error;
        }
    },
    update: async (id: string, input: { password?: string; [key: string]: unknown }) => {
        const { password, ...data } = input;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) throw new AppError(404, "User not found");
        try {
            return await prisma.user.update({
                where: { id },
                data: { ...data, ...(password ? { passwordHash: await argon2.hash(password) } : {}) } as never,
                omit: { passwordHash: true },
            });
        } catch (error) {
            if (isUniqueConstraintError(error, "username")) throw new AppError(409, "Username already exists");
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, "User already exists");
            throw error;
        }
    },
    archive: async (id: string, currentUserId: string) => {
        if (id === currentUserId) throw new AppError(409, "Cannot archive the current user");
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) throw new AppError(404, "User not found");
        await prisma.user.update({ where: { id }, data: { status: "ARCHIVED" } });
    },
    restore: async (id: string) => {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) throw new AppError(404, "User not found");
        await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
    },
};
