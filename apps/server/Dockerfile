# Build: install the workspace, generate the Prisma client, bundle the server.
FROM node:24-slim AS builder
RUN npm install -g pnpm@11
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/pnpm-store pnpm install --frozen-lockfile --store-dir /pnpm-store

# Generating the client never connects to a database; the URL only has to be valid.
RUN cd packages/db && DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm run db:generate

ENV NODE_ENV=production
RUN cd apps/server && pnpm run build

# Run: Node for the Prisma CLI (migrations), Bun for the server.
FROM node:24-slim AS runner
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app /app

EXPOSE 3000

# Apply any new database migrations, then start the API.
CMD ["sh", "-c", "cd /app/packages/db && ./node_modules/.bin/prisma migrate deploy && cd /app/apps/server && exec bun dist/index.mjs"]
