# STAGE 1: Builder

FROM node:24-alpine AS builder

WORKDIR /workspace

RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/common/package.json ./packages/common/

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @project/server run prisma:generate
RUN pnpm build:all

RUN pnpm --filter @project/server deploy --legacy --prod /prod/server

# STAGE 2: Runner

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 synergyuser

COPY --chown=synergyuser:nodejs --from=builder /prod/server ./

USER synergyuser

EXPOSE 3000

CMD ["node", "dist/infrastructure/http/server.js"]