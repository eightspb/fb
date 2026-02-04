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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

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

