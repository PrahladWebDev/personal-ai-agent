# Build context is the repository root (see docker-compose.yml), so paths
# below are relative to the repo root, not this backend/ folder.
FROM node:20-slim AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY database ./database
RUN mkdir -p /app/uploads
EXPOSE 4000
# Run migrations (idempotent) before starting so a fresh VPS deploy just
# works with `docker compose up -d` - no manual migration step needed.
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
