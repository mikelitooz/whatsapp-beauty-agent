import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { BotModule } from '../bot/bot.module';

@Module({
    imports: [BotModule],
    providers: [WhatsappService],
    controllers: [WhatsappController],
    exports: [WhatsappService],
})
export class WhatsappModule { }
