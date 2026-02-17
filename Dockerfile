FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install

RUN npx prisma generate

RUN npx tsc

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node prisma/seed.ts && node dist/main.js"]
