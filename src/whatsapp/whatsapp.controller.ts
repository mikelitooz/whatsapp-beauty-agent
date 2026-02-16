import { Controller, Get, Post, Query, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { BotService } from '../bot/bot.service';

@Controller('webhook')
export class WhatsappController {
    constructor(
        private readonly whatsapp: WhatsappService,
        private readonly bot: BotService,
    ) { }

    /**
     * Meta webhook verification
     */
    @Get()
    verify(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'glow_beauty_verify_2026';

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Webhook verified');
            return res.status(200).send(challenge);
        }

        // Accept any GET without params (health check from n8n/browser)
        if (!mode && !token) {
            return res.status(200).send('Glow Beauty WhatsApp Agent is running 🌸');
        }

        console.log('❌ Webhook verification failed');
        return res.status(403).send('Verification failed');
    }

    /**
     * Handle incoming WhatsApp messages
     */
    @Post()
    async handleIncoming(@Body() body: any, @Res() res: Response) {
        // Always respond 200 quickly
        res.status(200).send('OK');

        // Debug log — see what's arriving
        console.log('📥 Webhook POST received:', JSON.stringify(body, null, 2).substring(0, 500));

        try {
            // n8n might wrap payload in different ways — try to find the Meta structure
            let payload = body;

            // If n8n sends it wrapped in an array, unwrap
            if (Array.isArray(payload)) {
                payload = payload[0];
            }

            // If n8n nests the body inside a 'body' key
            if (payload?.body && payload?.body?.entry) {
                payload = payload.body;
            }

            // If n8n sends it as a stringified body inside a field
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { }
            }

            const entry = payload?.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (!value?.messages?.[0]) {
                console.log('ℹ️ No message in payload (status update or other event)');
                return;
            }

            const message = value.messages[0];
            const contact = value.contacts?.[0];
            const from = message.from; // Phone number

            // Mark as read
            if (message.id) {
                await this.whatsapp.markAsRead(message.id);
            }

            // Extract message content
            let userMessage = '';
            let buttonPayload = '';

            if (message.type === 'text') {
                userMessage = message.text?.body || '';
            } else if (message.type === 'interactive') {
                // Button reply
                if (message.interactive?.type === 'button_reply') {
                    buttonPayload = message.interactive.button_reply.id;
                    userMessage = message.interactive.button_reply.title;
                }
                // List reply
                if (message.interactive?.type === 'list_reply') {
                    buttonPayload = message.interactive.list_reply.id;
                    userMessage = message.interactive.list_reply.title;
                }
            } else if (message.type === 'button') {
                // Regular button (not interactive)
                buttonPayload = message.button?.payload || '';
                userMessage = message.button?.text || '';
            }

            if (!userMessage && !buttonPayload) {
                console.log('ℹ️ No text or button content in message');
                return;
            }

            const customerName = contact?.profile?.name || 'Customer';

            console.log(`📩 ${customerName} (${from}): ${userMessage || buttonPayload}`);

            // Process through bot engine
            await this.bot.handleMessage(from, userMessage, buttonPayload, customerName, this.whatsapp);
        } catch (error: any) {
            console.error('❌ Webhook processing error:', error.message);
            console.error('Full error:', error.stack);
        }
    }
}
