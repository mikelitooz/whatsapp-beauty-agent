FROM node:20-slim

# OpenSSL needed for Prisma on slim images
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev for build tools)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS
RUN npx nest build

# Push database schema and seed
RUN npx prisma db push && npx ts-node prisma/seed.ts

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start
CMD ["node", "dist/main.js"]
