# syntax=docker/dockerfile:1
# Сборка из корня монорепо: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

# Сначала только манифесты — чтобы кэш зависимостей не сбрасывался от правок кода
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# postinstall делает prisma generate — ему нужна схема
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @volkoff/api \
    && npm prune --omit=dev \
    && cd apps/api && npx prisma generate

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOADS_DIR=/data/uploads
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma

RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
WORKDIR /app/apps/api
EXPOSE 4000

# Миграции → наполнение пустой базы стартовым каталогом → сервер
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js --if-empty && exec node dist/index.js"]
