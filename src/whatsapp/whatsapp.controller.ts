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
     * Meta webhook verification / health check
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

        if (!mode && !token) {
            return res.status(200).send('Glow Beauty WhatsApp Agent is running 🌸');
        }

        console.log('❌ Webhook verification failed');
        return res.status(403).send('Verification failed');
    }

    /**
     * Handle incoming WhatsApp messages — supports both:
     * 1. Direct Meta Cloud API format
     * 2. 24 Manager BSP format (via n8n relay)
     */
    @Post()
    async handleIncoming(@Body() body: any, @Res() res: Response) {
        res.status(200).send('OK');

        // Full debug log
        console.log('📥 RAW PAYLOAD:', JSON.stringify(body, null, 2).substring(0, 3000));

        try {
            // Try to extract message from different payload formats
            const result = this.extractMessage(body);

            if (!result) {
                console.log('ℹ️ No extractable message in payload');
                return;
            }

            const { from, userMessage, buttonPayload, customerName, messageId } = result;

            // Mark as read
            if (messageId) {
                await this.whatsapp.markAsRead(messageId);
            }

            console.log(`📩 ${customerName} (${from}): ${userMessage || buttonPayload}`);

            // Process through bot engine
            await this.bot.handleMessage(from, userMessage, buttonPayload, customerName, this.whatsapp);
        } catch (error: any) {
            console.error('❌ Webhook processing error:', error.message);
            console.error('Stack:', error.stack);
        }
    }

    /**
     * Extract message from various payload formats
     */
    private extractMessage(body: any): {
        from: string;
        userMessage: string;
        buttonPayload: string;
        customerName: string;
        messageId: string;
    } | null {

        // ===== FORMAT 1: 24 Manager BSP (via n8n) =====
        // Payload: { headers, params, query, body: { instance_id, data: { event, message: { body_message, message_key, push_name, from_contact } } } }
        const bspData = body?.body?.data || body?.data;
        if (bspData && bspData.event === 'received_message') {
            const msg = bspData.message;
            console.log('🔍 24 Manager BSP message:', JSON.stringify(msg, null, 2).substring(0, 2000));

            // Extract phone from message.from_contact or message_key.remoteJid
            const from = msg?.from_contact || msg?.message_key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
            const cleanPhone = from.replace(/\D/g, '');
            const pushName = msg?.push_name || 'Customer';
            const messageId = msg?.message_key?.id || '';

            if (!cleanPhone) {
                console.log('ℹ️ BSP data has no phone number');
                return null;
            }

            // Extract message content
            let userMessage = '';
            let buttonPayload = '';

            // Text message — body_message.content or messages.conversation
            if (msg?.body_message?.content) {
                userMessage = msg.body_message.content;
            } else if (msg?.body_message?.messages?.conversation) {
                userMessage = msg.body_message.messages.conversation;
            }

            // Button response (when user clicks a reply button)
            if (msg?.body_message?.type === 'buttonsResponseMessage') {
                buttonPayload = msg.body_message.messages?.selectedButtonId || '';
                userMessage = msg.body_message.content || msg.body_message.messages?.selectedDisplayText || userMessage;
            }

            // Interactive button reply
            if (msg?.body_message?.type === 'interactive' || msg?.body_message?.messages?.button_reply) {
                const btnReply = msg.body_message.messages?.button_reply;
                if (btnReply) {
                    buttonPayload = btnReply.id || '';
                    userMessage = btnReply.title || userMessage;
                }
            }

            // Interactive list reply
            if (msg?.body_message?.messages?.list_reply) {
                const listReply = msg.body_message.messages.list_reply;
                buttonPayload = listReply.id || '';
                userMessage = listReply.title || userMessage;
            }

            if (!userMessage && !buttonPayload) {
                console.log('ℹ️ BSP format but no text/button content found in body_message');
                return null;
            }

            console.log(`✅ Extracted: phone=${cleanPhone}, name=${pushName}, msg="${userMessage}", btn="${buttonPayload}"`);
            return { from: cleanPhone, userMessage, buttonPayload, customerName: pushName, messageId };
        }

        // ===== FORMAT 2: Direct Meta Cloud API =====
        // Payload: { entry: [{ changes: [{ value: { messages: [...] } }] }] }
        let payload = body;
        if (Array.isArray(payload)) payload = payload[0];

        const entry = payload?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.[0]) {
            return null;
        }

        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const from = message.from;
        const customerName = contact?.profile?.name || 'Customer';

        let userMessage = '';
        let buttonPayload = '';

        if (message.type === 'text') {
            userMessage = message.text?.body || '';
        } else if (message.type === 'interactive') {
            if (message.interactive?.type === 'button_reply') {
                buttonPayload = message.interactive.button_reply.id;
                userMessage = message.interactive.button_reply.title;
            }
            if (message.interactive?.type === 'list_reply') {
                buttonPayload = message.interactive.list_reply.id;
                userMessage = message.interactive.list_reply.title;
            }
        } else if (message.type === 'button') {
            buttonPayload = message.button?.payload || '';
            userMessage = message.button?.text || '';
        }

        if (!userMessage && !buttonPayload) return null;

        return { from, userMessage, buttonPayload, customerName, messageId: message.id || '' };
    }
}
