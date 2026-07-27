import { z } from "zod";

export const loginSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(20),
});

export const setupSchema = z.object({
    name: z.string().trim().min(1).max(160),
    username: z.string().trim().min(3).max(80),
    password: z.string().min(12).max(256),
});
