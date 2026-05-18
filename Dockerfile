# ─── Stage 1: Build React ────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
LABEL description="H-2 Visa Scanner Pro v2 with JWT Auth"

RUN apk add --no-cache python3 make g++

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY --from=client-builder /app/client/dist ./client/dist

RUN mkdir -p /app/data && chown -R appuser:appgroup /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/scanner.db

USER appuser
EXPOSE 3001

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
