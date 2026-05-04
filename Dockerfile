# syntax=docker/dockerfile:1.7
# Multi-stage build:
#   1. client-build: install client deps + run Vite production build
#   2. runtime: install only server deps + copy server source + the built dist

ARG NODE_VERSION=24-alpine

# ---------- Stage 1: build the client ----------
FROM node:${NODE_VERSION} AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY client/ ./
RUN npm run build

# ---------- Stage 2: install server deps ----------
FROM node:${NODE_VERSION} AS server-deps
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Stage 3: runtime ----------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=5050

WORKDIR /app

# Server source + production deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Built client assets — server/index.js serves them from ../client/dist
COPY --from=client-build /app/client/dist ./client/dist

# Persistable upload directory (mount a volume on this path)
RUN mkdir -p /app/server/uploads/photos

EXPOSE 5050
WORKDIR /app/server
CMD ["node", "index.js"]
