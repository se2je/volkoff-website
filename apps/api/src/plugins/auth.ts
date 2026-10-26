import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType, ZodTypeDef } from 'zod';
import { prisma } from '../db';
import { badRequest, forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken, type AccessClaims } from '../lib/security';

declare module 'fastify' {
    interface FastifyRequest {
        auth?: AccessClaims;
    }
}

const readBearer = (req: FastifyRequest) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7);
};

/** preHandler: требует валидный access-токен */
export const requireAuth = async (req: FastifyRequest, _reply: FastifyReply) => {
    const token = readBearer(req);
    if (!token) throw unauthorized();
    try {
        req.auth = await verifyAccessToken(token);
    } catch {
        throw unauthorized('TOKEN_INVALID');
    }
};

/** preHandler: требует роль ADMIN. Роль перепроверяем в БД — понижение прав действует сразу. */
export const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub }, select: { role: true } });
    if (user?.role !== 'ADMIN') throw forbidden();
};

/** Валидация входных данных zod-схемой → 400 с деталями */
export const parse = <T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) throw badRequest('VALIDATION_ERROR', 'Invalid input', result.error.flatten());
    return result.data;
};
