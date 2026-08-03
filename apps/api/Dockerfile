# Build a partir da raiz do monorepo: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @evoluta-gamers/shared build \
 && pnpm --filter @evoluta-gamers/api build \
 && pnpm deploy --filter @evoluta-gamers/api --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Epic Games não tem API oficial de biblioteca — usamos a `legendary`
# (GPL-3.0, https://github.com/derrod/legendary) via subprocess. Ver
# TASKS/capitulos/04-steam.md, adendo Epic Games.
RUN apk add --no-cache python3 py3-pip \
 && python3 -m venv /opt/legendary-venv \
 && /opt/legendary-venv/bin/pip install --no-cache-dir legendary-gl
ENV LEGENDARY_BIN=/opt/legendary-venv/bin/legendary

COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 3333
CMD ["node", "dist/main.js"]
