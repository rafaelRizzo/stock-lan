import { z } from "zod";

const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
    DOCS_ENABLED: z
        .enum(["true", "false"])
        .default("true")
        .transform((value) => value === "true"),
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const allowsAnyCorsOrigin = env.NODE_ENV === "development" && corsOrigins.includes("*");

if (env.NODE_ENV === "production" && corsOrigins.includes("*"))
    throw new Error("CORS_ORIGINS cannot contain '*' in production");
