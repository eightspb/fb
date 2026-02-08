# Production Dockerfile with Bun
FROM oven/bun:1-alpine AS base
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies with Bun
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile && \
    bun install lightningcss-linux-x64-musl @tailwindcss/oxide-linux-x64-musl --no-save

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build environment variables (must be in builder stage)

# Build Next.js with Bun
RUN bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Security: Create read-only directories and restrict /tmp
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app/.next/cache && \
    chmod 755 /app/.next/cache

# Copy public folder but preserve existing background.png on server if it exists
COPY --from=builder /app/public ./public.tmp
RUN if [ -f ./public/images/background.png ]; then \
      cp ./public/images/background.png ./public.tmp/images/background.png.bak 2>/dev/null || true; \
    fi && \
    mv ./public.tmp ./public && \
    if [ -f ./public/images/background.png.bak ]; then \
      mv ./public/images/background.png.bak ./public/images/background.png; \
    fi
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Копируем instrumentation для логирования (Next.js standalone не всегда включает его)
COPY --from=builder /app/instrumentation.js ./instrumentation.js 2>/dev/null || true
COPY --from=builder /app/.next/server/instrumentation.js ./.next/server/instrumentation.js 2>/dev/null || true

# Security: Set proper permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Disable tmp if possible, or make it noexec
# Mount /tmp as noexec in docker-compose instead

# Use node for running Next.js standalone server (more stable than Bun for production)
CMD ["node", "server.js"]

