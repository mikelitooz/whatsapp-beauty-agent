#!/bin/sh
echo "🌸 Setting up database..."
npx prisma db push --skip-generate
echo "🌸 Seeding products..."
npx ts-node prisma/seed.ts
echo "🌸 Starting server..."
node dist/main.js
