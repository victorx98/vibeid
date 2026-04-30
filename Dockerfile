# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

FROM base AS builder

RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG BUILD_NODE_OPTIONS="--max-old-space-size=4096"
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED="false"
ARG NEXT_PUBLIC_ENABLE_VIBE_SAMPLE="false"

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED=$NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED
ENV NEXT_PUBLIC_ENABLE_VIBE_SAMPLE=$NEXT_PUBLIC_ENABLE_VIBE_SAMPLE

RUN NODE_OPTIONS="$BUILD_NODE_OPTIONS" npm run build

FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache dumb-init libc6-compat && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => { process.exit(r.statusCode < 500 ? 0 : 1) }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
