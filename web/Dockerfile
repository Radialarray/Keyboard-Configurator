# LazyQMK Frontend Dockerfile
# Multi-stage build for SvelteKit with Node adapter

# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

# Copy package files
COPY web/package.json web/package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build the SvelteKit app
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY web/ ./

# Install svelte-adapter-node for production builds
RUN npm install @sveltejs/adapter-node

# Update svelte.config.js to use node adapter for production
RUN sed -i "s/@sveltejs\/adapter-auto/@sveltejs\/adapter-node/g" svelte.config.js

# Build the application
RUN npm run build

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN useradd -r -s /bin/false lazyqmk

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install only production dependencies for the Node adapter
RUN npm install --omit=dev @sveltejs/adapter-node

USER lazyqmk

# Expose the port
EXPOSE 5173

# Environment variables
ENV PORT=5173
ENV HOST=0.0.0.0
ENV ORIGIN=http://localhost:5173

# Run the production server
CMD ["node", "build"]
