# Use Debian Bookworm for Prisma engine (OpenSSL 3 compatibility)
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates libssl3 postgresql-client && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "until pg_isready -h db -p 5432 -U oont -d oont; do echo 'Waiting for db...'; sleep 2; done && npx prisma migrate deploy && node dist/main.js"]
