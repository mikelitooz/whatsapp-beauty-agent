FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Build with tsc directly (more reliable than nest build in Docker)
RUN npx tsc

# Verify dist exists
RUN ls -la dist/ && echo "✅ Build verified — dist/main.js exists"

ENV PORT=3000
EXPOSE 3000

CMD ["./start.sh"]
