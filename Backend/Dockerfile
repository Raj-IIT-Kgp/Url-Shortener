# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Copy package.json and lockfile
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Generate Prisma Client (DATABASE_URL is not used during generation, only schema is read)
RUN DATABASE_URL=postgresql://user:password@localhost:5432/db npx prisma generate

# Build the NestJS application
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy the build artifacts and generated Prisma client from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nestjs

# Expose backend port
EXPOSE 3001

# Start the application
CMD [ "node", "dist/src/main.js" ]
