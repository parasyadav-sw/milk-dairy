# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma client support
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package file
COPY package.json ./

# Install dependencies including devDependencies
RUN npm install

# Copy Prisma files and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npm run build

# Stage 2: Production Runner
FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma runner support
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package file
COPY package.json ./

# Install production-only dependencies
RUN npm install --only=production

# Copy compiled JavaScript, prisma schema, and generated clients from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Apply database migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
