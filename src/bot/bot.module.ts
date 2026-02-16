import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [ProductsModule],
    providers: [BotService],
    exports: [BotService],
})
export class BotModule { }
