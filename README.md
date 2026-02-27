# WhatsApp Beauty Agent 💄✨

An AI-powered automated WhatsApp shopping assistant built with **NestJS**, **Prisma**, and **OpenAI**. The agent handles customer inquiries, recommends beauty products based on their requests, and facilitates the shopping experience directly through WhatsApp.

## Features

- **WhatsApp Cloud API Integration:** Real-time message reception and automated replies using Meta's Cloud API.
- **AI-Powered Recommendations:** Natural language understanding using OpenAI's models to interpret user intent.
- **Product Knowledge Base:** SQLite database managed by Prisma to store and retrieve beauty product inventory dynamically.
- **Contextual Awareness:** The agent acts as "Glow Beauty," a helpful and engaging store assistant.

## Tech Stack

- **Framework:** NestJS
- **Database ORM:** Prisma
- **AI Engine:** OpenAI API (`gpt-4o-mini` or similar)
- **Language:** TypeScript

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your credentials:
```env
# Database
DATABASE_URL="file:./dev.db"

# WhatsApp API
WHATSAPP_VERIFY_TOKEN="your_verify_token"
WHATSAPP_PHONE_ID="your_whatsapp_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_meta_system_user_access_token"

# OpenAI API
OPENAI_API_KEY="your_openai_api_key"
```

### 3. Database Initialization
Push the database schema and seed the initial product data:
```bash
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Running the Application
```bash
# Development mode
npm run start:dev

# Production build and run
npm run build
npm start
```

## Security Note
This repository has been scanned and verified to contain no hardcoded sensitive credentials. Always ensure your `.env` file is included in `.gitignore` before committing.
