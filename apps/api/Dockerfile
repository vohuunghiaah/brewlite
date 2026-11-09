# ==========================================
# BrewLite API - Multi-stage Production Dockerfile
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# System dependencies for Prisma engine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install all dependencies and generate Prisma client
RUN npm install --legacy-peer-deps
RUN npx prisma generate

# Build NestJS production distribution
COPY src ./src
RUN npm run build

# ==========================================
# Stage 2: Minimal Production Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then node dist/src/main.js; else node dist/main.js; fi"]

