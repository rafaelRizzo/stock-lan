import { Prisma } from "@prisma/client";
import { AppError, isUniqueConstraintError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { unaccentSearchIds } from "../../lib/search.js";

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
        const searchIds = input.search ? await unaccentSearchIds("Supplier", ["name"], input.search) : undefined;
        if (searchIds && searchIds.length === 0) return { data: [], total: 0 };
        const where = {
            ...(input.status
                ? { status: input.status }
                : input.includeArchived
                  ? {}
                  : { status: { not: "ARCHIVED" as const } }),
            ...(searchIds ? { id: { in: searchIds } } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: [{ name: "asc" }, { id: "asc" }],
                skip: input.skip,
                take: input.take,
            }),
            prisma.supplier.count({ where }),
        ]);
        return { data, total };
    },
    create: async (input: SupplierInput, createdUserId: string) => {
        try {
            return await prisma.supplier.create({ data: { ...input, createdUserId } });
        } catch (error) {
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, "Supplier already exists");
            throw error;
        }
    },
    update: async (id: string, input: Partial<SupplierInput>) => {
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) throw new AppError(404, "Supplier not found");
        try {
            return await prisma.supplier.update({ where: { id }, data: input });
        } catch (error) {
            if (isUniqueConstraintError(error, "name")) throw new AppError(409, "Supplier already exists");
            throw error;
        }
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
        const linkedBatches = await prisma.stockBatch.count({ where: { supplierId: id } });
        if (linkedBatches > 0)
            throw new AppError(409, "Supplier cannot be deleted because it has linked records", [
                { label: "lote(s) de estoque", path: "/dashboard/stock/batches", count: linkedBatches },
            ]);
        try {
            await prisma.supplier.delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
                throw new AppError(409, "Supplier cannot be deleted because it has linked records");
            throw error;
        }
    },
};
