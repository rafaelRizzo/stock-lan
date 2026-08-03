import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

type SupplierInput = {
    name: string;
    phone?: string | null;
    obs?: string | null;
    status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

export const suppliersService = {
    list: async (input: {
        search?: string;
        status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
        includeArchived?: boolean;
        skip: number;
        take: number;
    }) => {
        const where = {
            ...(input.status
                ? { status: input.status }
                : input.includeArchived
                  ? {}
                  : { status: { not: "ARCHIVED" as const } }),
            ...(input.search ? { name: { contains: input.search, mode: "insensitive" as const } } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: input.skip,
                take: input.take,
            }),
            prisma.supplier.count({ where }),
        ]);
        return { data, total };
    },
    create: (input: SupplierInput, createdUserId: string) =>
        prisma.supplier.create({ data: { ...input, createdUserId } }),
    update: async (id: string, input: Partial<SupplierInput>) => {
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) throw new AppError(404, "Supplier not found");
        return prisma.supplier.update({ where: { id }, data: input });
    },
    archive: async (id: string) => {
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) throw new AppError(404, "Supplier not found");
        await prisma.supplier.update({ where: { id }, data: { status: "ARCHIVED" } });
    },
    restore: async (id: string) => {
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) throw new AppError(404, "Supplier not found");
        await prisma.supplier.update({ where: { id }, data: { status: "ACTIVE" } });
    },
    permanentDelete: async (id: string) => {
        try {
            await prisma.supplier.delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
                throw new AppError(409, "Supplier cannot be deleted because it has linked records");
            throw error;
        }
    },
};
