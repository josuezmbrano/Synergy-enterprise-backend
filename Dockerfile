# STAGE 1: Builder

FROM node:24.17-alpine AS builder

WORKDIR /workspace

RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/common/package.json ./packages/common/

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run server:prisma-generate
RUN pnpm --filter @project/server... build

RUN pnpm --filter @project/server deploy --legacy --prod /prod/server

# STAGE 2: Runner

FROM node:24.17-alpine AS runner

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

ENV AWS_LWA_READINESS_CHECK_PATH=/health/readiness
ENV AWS_LWA_READINESS_CHECK_PORT=3000

RUN apk upgrade --no-cache && \ 
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 synergyuser && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --chown=synergyuser:nodejs --from=builder /prod/server ./

USER synergyuser

EXPOSE 3000

CMD ["node", "dist/infrastructure/http/server.js"]