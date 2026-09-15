# Dockerfile for Travezy Fullstack Platform on Render / Cloud Containers
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci || npm install

# Copy source files
COPY . .

# Build the fullstack application
RUN npm run build

# Production runtime stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NITRO_HOST=0.0.0.0
ENV PORT=10000

# Copy runtime assets and built bundles from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public

EXPOSE 10000

CMD ["node", "scripts/start.mjs"]
