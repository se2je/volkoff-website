# syntax=docker/dockerfile:1
# Сборка из корня монорепо: docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
# --ignore-scripts: фронту не нужен prisma generate из api
RUN npm ci --ignore-scripts

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @volkoff/web

FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fs http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
