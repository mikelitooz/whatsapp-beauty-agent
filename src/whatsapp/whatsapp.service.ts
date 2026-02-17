import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
    private readonly phoneNumberId = process.env.WHATSAPP_PHONE_ID;
    private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    private readonly apiVersion = 'v21.0';
    private readonly baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    private get headers() {
        return {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Send a plain text message
     */
    async sendMessage(to: string, message: string) {
        try {
            console.log(`📤 Sending text to ${to}: "${message.substring(0, 50)}..."`);
            const res = await axios.post(
                `${this.baseUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { body: message },
                },
                { headers: this.headers },
            );
            console.log(`✅ Message sent! ID: ${res.data.messages?.[0]?.id}`);
            return { success: true, messageId: res.data.messages?.[0]?.id };
        } catch (err: any) {
            console.error('❌ sendMessage error:', err.response?.data || err.message);
            return { success: false, error: err.response?.data?.error?.message || err.message };
        }
    }

    /**
     * Send product card — image header + price body + Add to Cart button
     */
    async sendProductCard(
        to: string,
        product: { id: string; name: string; price: number; originalPrice?: number; imageUrl: string; description: string },
    ) {
        const priceText = product.originalPrice
            ? `Current price: ₦${product.price.toLocaleString()}\n(Original price: ₦${product.originalPrice.toLocaleString()})`
            : `Price: ₦${product.price.toLocaleString()}`;

        const body = `✨ *${product.name}*\n${priceText}\n\n${product.description}`;
        console.log(`📤 Sending product card to ${to}: ${product.name}`);

        // Truncate name for button (max 20 chars for button title)
        // format: "Add <Name>"
        // "Add " is 4 chars. allowable name = 14 chars.
        const shortName = product.name.length > 13 ? product.name.substring(0, 12) + '..' : product.name;

        try {
            const res = await axios.post(
                `${this.baseUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'button',
                        header: {
                            type: 'image',
                            image: { link: product.imageUrl },
                        },
                        body: { text: body },
                        action: {
                            buttons: [
                                {
                                    type: 'reply',
                                    reply: { id: `add_${product.id}`, title: `🛒 Add ${shortName}` },
                                },
                                {
                                    type: 'reply',
                                    reply: { id: `details_${product.id}`, title: `📋 View ${shortName}` },
                                },
                            ],
                        },
                    },
                },
                { headers: this.headers },
            );
            console.log(`✅ Product card sent! ID: ${res.data.messages?.[0]?.id}`);
            return { success: true, messageId: res.data.messages?.[0]?.id };
        } catch (err: any) {
            console.error('❌ sendProductCard error:', err.response?.data || err.message);
            // Fallback to text-only
            return this.sendMessage(to, body);
        }
    }

    /**
     * Send interactive buttons (generic)
     */
    async sendButtons(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>,
        headerText?: string,
    ) {
        try {
            console.log(`📤 Sending buttons to ${to}: "${bodyText.substring(0, 30)}..." with ${buttons.length} buttons`);
            const interactive: any = {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.slice(0, 3).map((btn) => ({
                        type: 'reply',
                        reply: { id: btn.id, title: btn.title.substring(0, 20) },
                    })),
                },
            };

            if (headerText) {
                interactive.header = { type: 'text', text: headerText };
            }

            const res = await axios.post(
                `${this.baseUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'interactive',
                    interactive,
                },
                { headers: this.headers },
            );
            console.log(`✅ Buttons sent! ID: ${res.data.messages?.[0]?.id}`);
            return { success: true, messageId: res.data.messages?.[0]?.id };
        } catch (err: any) {
            console.error('❌ sendButtons error:', err.response?.data || err.message);
            return this.sendMessage(to, bodyText);
        }
    }

    /**
     * Send cart summary with checkout button
     */
    async sendCartSummary(
        to: string,
        items: Array<{ name: string; quantity: number; price: number }>,
        total: number,
    ) {
        let cartText = '🛒 *Your Cart*\n\n';
        items.forEach((item) => {
            cartText += `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}\n`;
        });
        cartText += `\n💰 *Total: ₦${total.toLocaleString()}*`;

        return this.sendButtons(to, cartText, [
            { id: 'checkout', title: '✅ Checkout' },
            { id: 'continue_shopping', title: '🔍 Keep Shopping' },
            { id: 'clear_cart', title: '🗑️ Clear Cart' },
        ]);
    }

    /**
     * Send order confirmation
     */
    async sendOrderConfirmation(
        to: string,
        orderNumber: string,
        total: number,
        address: string,
    ) {
        const msg =
            `✅ *Order Confirmed!*\n\n` +
            `📦 Order #${orderNumber}\n` +
            `💰 Total: ₦${total.toLocaleString()}\n` +
            `📍 Delivery to: ${address}\n\n` +
            `🚚 Estimated delivery: 2-3 business days\n\n` +
            `Thank you for shopping with Glow Beauty! 💖`;

        return this.sendMessage(to, msg);
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId: string) {
        try {
            await axios.post(
                `${this.baseUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                },
                { headers: this.headers },
            );
        } catch (err) {
            // Silent fail for read receipts
        }
    }
}
