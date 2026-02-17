FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npx nest build

# Copy a startup script that handles DB setup at runtime
COPY start.sh ./
RUN chmod +x start.sh

ENV PORT=3000
EXPOSE 3000

CMD ["./start.sh"]
