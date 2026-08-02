import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";

const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) throw new Error("ADMIN_PASSWORD must have at least 12 characters");

const admin = await prisma.user.upsert({
    where: { username },
    update: { passwordHash: await argon2.hash(password), role: "ADMIN", status: "ACTIVE" },
    create: { name: "Administrator", username, passwordHash: await argon2.hash(password), role: "ADMIN" },
});
console.log(`Admin ready: ${admin.username}`);
await prisma.$disconnect();
