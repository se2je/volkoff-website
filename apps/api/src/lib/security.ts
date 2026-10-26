import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@volkoff/shared';
import { env } from '../env';

// ------------------------------------------------------------
// Пароли — argon2id
// ------------------------------------------------------------
export const hashPassword = (password: string) =>
    hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = async (passwordHash: string, password: string) => {
    try {
        return await verify(passwordHash, password);
    } catch {
        return false;
    }
};

// Фиктивный хеш, чтобы время ответа на логин не выдавало, существует ли email
let dummyHash: string | null = null;
export const burnPasswordCheck = async (password: string) => {
    dummyHash ??= await hashPassword('dummy-password-for-timing');
    await verifyPassword(dummyHash, password);
};

// ------------------------------------------------------------
// Случайные токены (refresh, подтверждение почты, сброс пароля).
// Клиент получает сам токен, в БД кладём только sha256.
// ------------------------------------------------------------
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// ------------------------------------------------------------
// JWT access-токен: короткоживущий, передаётся в Authorization: Bearer
// ------------------------------------------------------------
const jwtKey = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = 'volkoff-api';
const AUDIENCE = 'volkoff-web';
export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_DAYS = 30;

export interface AccessClaims {
    sub: string;
    role: Role;
    sid: string;
}

export const signAccessToken = (claims: AccessClaims) =>
    new SignJWT({ role: claims.role, sid: claims.sid })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
        .sign(jwtKey);

export const verifyAccessToken = async (token: string): Promise<AccessClaims> => {
    const { payload } = await jwtVerify(token, jwtKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
    });
    return { sub: payload.sub as string, role: payload.role as Role, sid: payload.sid as string };
};
