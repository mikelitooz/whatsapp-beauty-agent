import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BotModule } from './bot/bot.module';
import { ProductsModule } from './products/products.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        WhatsappModule,
        BotModule,
        ProductsModule,
    ],
})
export class AppModule { }
