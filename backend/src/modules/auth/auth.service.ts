import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

async function issueTokens(app: FastifyInstance, user: { id: string; role: "ADMIN" | "MANAGER" | "OPERATOR" }) {
    const secret = randomBytes(48).toString("base64url");
    const session = await prisma.userSession.create({
        data: {
            userId: user.id,
            createdUserId: user.id,
            tokenHash: await argon2.hash(secret),
            expiresAt: new Date(Date.now() + 2_592_000_000),
        },
    });
    return {
        accessToken: app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" }),
        refreshToken: `${session.id}.${secret}`,
    };
}

export const authService = {
    setupStatus: async () => ({ needsSetup: (await prisma.user.count()) === 0 }),

    setup: async (app: FastifyInstance, input: { name: string; username: string; password: string }) => {
        let user: { id: string; role: "ADMIN" | "MANAGER" | "OPERATOR" };
        try {
            user = await prisma.$transaction(
                async (tx) => {
                    if ((await tx.user.count()) > 0) throw new AppError(409, "Initial setup already completed");
                    return tx.user.create({
                        data: {
                            name: input.name,
                            username: input.username,
                            passwordHash: await argon2.hash(input.password),
                            role: "ADMIN",
                        },
                        select: { id: true, role: true },
                    });
                },
                { isolationLevel: "Serializable" },
            );
        } catch (error) {
            if (error instanceof AppError) throw error;
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                (error.code === "P2002" || error.code === "P2034")
            )
                throw new AppError(409, "Initial setup already completed");
            throw error;
        }
        return issueTokens(app, user);
    },

    login: async (app: FastifyInstance, username: string, password: string) => {
        const user = await prisma.user.findUnique({ where: { username } });
        if (user?.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, password)))
            throw new AppError(401, "Invalid username or password");
        return issueTokens(app, user);
    },

    refresh: async (app: FastifyInstance, refreshToken: string) => {
        const [sessionId, secret] = refreshToken.split(".", 2);
        if (!sessionId || !secret) throw new AppError(401, "Invalid refresh token");
        const session = await prisma.userSession.findUnique({ where: { id: sessionId }, include: { user: true } });
        if (
            !session ||
            session.revokedAt ||
            session.expiresAt <= new Date() ||
            !(await argon2.verify(session.tokenHash, secret))
        )
            throw new AppError(401, "Invalid refresh token");
        await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        return issueTokens(app, session.user);
    },

    logout: async (refreshToken: string, userId: string) => {
        const sessionId = refreshToken.split(".", 1)[0];
        if (sessionId)
            await prisma.userSession.updateMany({
                where: { id: sessionId, userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
    },

    me: async (userId: string) => {
        const user = await prisma.user.findUnique({ where: { id: userId }, omit: { passwordHash: true } });
        if (user?.status !== "ACTIVE") throw new AppError(401, "Unauthorized");
        return user;
    },
};
