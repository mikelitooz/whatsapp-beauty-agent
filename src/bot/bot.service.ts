import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class BotService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly products: ProductsService,
    ) { }

    /**
     * Main message handler — routes text and button clicks
     */
    async handleMessage(
        phone: string,
        text: string,
        buttonPayload: string,
        customerName: string,
        wa: WhatsappService,
    ) {
        // Get or create conversation state
        const state = await this.getState(phone);

        // === TEXT FALLBACK FOR BUTTONS ===
        // If payload is missing, check if text matches specific button titles
        if (!buttonPayload) {
            const t = text.trim();
            if (t.includes('💄 Makeup') || t.toLowerCase() === 'makeup') buttonPayload = 'cat_Makeup';
            else if (t.includes('🧴 Skincare') || t.toLowerCase() === 'skincare') buttonPayload = 'cat_Skincare';
            else if (t.includes('💇 Hair') || t.toLowerCase() === 'hair') buttonPayload = 'cat_Hair';
            else if (t.includes('✅ Checkout') || t.toLowerCase() === 'checkout') buttonPayload = 'checkout';
            else if (t.includes('🛒 View Cart') || t.toLowerCase() === 'view cart') buttonPayload = 'view_cart';
            else if (t.includes('🗑️ Clear Cart')) buttonPayload = 'clear_cart';
            else if (t.includes('🔍 More Categories')) buttonPayload = 'browse';
            else if (t.includes('🔍 Keep Shopping')) buttonPayload = 'browse';
            else if (t.includes('🛒 Add ')) {
                // Formatting: "🛒 Add <Name>"
                // Try to find product by name
                const productName = t.replace('🛒 Add ', '').replace('..', '').trim();
                const products = await this.products.search(productName);
                if (products.length > 0) buttonPayload = `add_${products[0].id}`;
            }
            else if (t.includes('📋 View ')) {
                // Formatting: "📋 View <Name>"
                const productName = t.replace('📋 View ', '').replace('..', '').trim();
                const products = await this.products.search(productName);
                if (products.length > 0) buttonPayload = `details_${products[0].id}`;
            }
        }

        // === BUTTON CLICKS ===
        if (buttonPayload) {
            return this.handleButton(phone, buttonPayload, customerName, state, wa);
        }

        // === TEXT MESSAGES ===
        const lowerText = text.toLowerCase().trim();

        // Greeting / Start
        if (['hi', 'hello', 'hey', 'start', 'menu'].includes(lowerText) || state.state === 'IDLE') {
            return this.sendWelcome(phone, customerName, wa);
        }

        // Checkout flow: waiting for address
        if (state.state === 'AWAITING_ADDRESS') {
            return this.processAddress(phone, text, wa);
        }

        // Search products
        if (state.state === 'BROWSING' || state.state === 'IDLE') {
            return this.searchProducts(phone, text, wa);
        }

        // Fallback
        return this.sendWelcome(phone, customerName, wa);
    }

    /**
     * Handle button clicks
     */
    private async handleButton(
        phone: string,
        payload: string,
        customerName: string,
        state: any,
        wa: WhatsappService,
    ) {
        // Category selection
        if (payload.startsWith('cat_')) {
            const category = payload.replace('cat_', '');
            return this.showCategory(phone, category, wa);
        }

        // Add to cart
        if (payload.startsWith('add_')) {
            const productId = payload.replace('add_', '');
            return this.addToCart(phone, productId, wa);
        }

        // View product details
        if (payload.startsWith('details_')) {
            const productId = payload.replace('details_', '');
            return this.showProductDetails(phone, productId, wa);
        }

        // Cart actions
        if (payload === 'view_cart') return this.showCart(phone, wa);
        if (payload === 'checkout') return this.startCheckout(phone, wa);
        if (payload === 'continue_shopping') return this.sendCategories(phone, wa);
        if (payload === 'clear_cart') return this.clearCart(phone, wa);
        if (payload === 'pay_now') return this.processPayment(phone, wa);
        if (payload === 'cancel_order') return this.cancelCheckout(phone, wa);
        if (payload === 'browse') return this.sendCategories(phone, wa);

        // Fallback
        return this.sendWelcome(phone, customerName, wa);
    }

    /**
     * Welcome message with category buttons
     */
    private async sendWelcome(phone: string, name: string, wa: WhatsappService) {
        await this.setState(phone, 'BROWSING');

        await wa.sendMessage(
            phone,
            `Hey ${name}! 💖 Welcome to *Glow Beauty*\n\nWe have amazing products in Makeup, Skincare & Hair. Browse our categories below or type what you're looking for!`,
        );

        // Small delay so messages arrive in order
        await this.delay(500);

        return this.sendCategories(phone, wa);
    }

    /**
     * Send category selection buttons
     */
    private async sendCategories(phone: string, wa: WhatsappService) {
        await this.setState(phone, 'BROWSING');

        return wa.sendButtons(
            phone,
            'What are you looking for today?',
            [
                { id: 'cat_Makeup', title: '💄 Makeup' },
                { id: 'cat_Skincare', title: '🧴 Skincare' },
                { id: 'cat_Hair', title: '💇 Hair' },
            ],
            '🌸 Shop by Category',
        );
    }

    /**
     * Show all products in a category as product cards
     */
    private async showCategory(phone: string, category: string, wa: WhatsappService) {
        const items = await this.products.getByCategory(category);

        if (items.length === 0) {
            return wa.sendMessage(phone, `No products found in ${category}. Try another category!`);
        }

        await wa.sendMessage(phone, `✨ *${category} Collection* — ${items.length} products`);

        // Send each product as a card with slight delay
        for (const product of items) {
            await this.delay(300);
            await wa.sendProductCard(phone, product);
        }

        // After showing products, offer navigation
        await this.delay(500);
        return wa.sendButtons(
            phone,
            `That's our ${category} collection! Want to see more or check your cart?`,
            [
                { id: 'browse', title: '🔍 More Categories' },
                { id: 'view_cart', title: '🛒 View Cart' },
            ],
        );
    }

    /**
     * Search products by text
     */
    private async searchProducts(phone: string, query: string, wa: WhatsappService) {
        const results = await this.products.search(query);

        if (results.length === 0) {
            await wa.sendMessage(
                phone,
                `Hmm, I couldn't find anything matching "${query}". Try browsing our categories instead! 🔍`,
            );
            return this.sendCategories(phone, wa);
        }

        await wa.sendMessage(phone, `🔍 Found ${results.length} result${results.length > 1 ? 's' : ''} for "${query}":`);

        for (const product of results) {
            await this.delay(300);
            await wa.sendProductCard(phone, product);
        }

        await this.delay(500);
        return wa.sendButtons(
            phone,
            `Want to see more or check your cart?`,
            [
                { id: 'browse', title: '🔍 More Categories' },
                { id: 'view_cart', title: '🛒 View Cart' },
            ],
        );
    }

    /**
     * Show product details
     */
    private async showProductDetails(phone: string, productId: string, wa: WhatsappService) {
        const product = await this.products.getById(productId);
        if (!product) return wa.sendMessage(phone, 'Product not found!');

        const savings = product.originalPrice ? product.originalPrice - product.price : 0;
        let detail = `✨ *${product.name}*\n\n`;
        detail += `${product.description}\n\n`;
        detail += `💰 Price: ₦${product.price.toLocaleString()}\n`;
        if (savings > 0) {
            detail += `🔥 You save: ₦${savings.toLocaleString()}!\n`;
        }
        detail += `📦 Category: ${product.category}\n`;
        detail += product.inStock ? `✅ In Stock` : `❌ Out of Stock`;

        return wa.sendButtons(phone, detail, [
            { id: `add_${product.id}`, title: '🛒 Add to Cart' },
            { id: 'browse', title: '🔍 Keep Shopping' },
        ]);
    }

    /**
     * Add product to cart
     */
    private async addToCart(phone: string, productId: string, wa: WhatsappService) {
        const product = await this.products.getById(productId);
        if (!product) return wa.sendMessage(phone, 'Product not found!');

        // Get or create cart
        let cart = await this.prisma.cart.findUnique({ where: { phone } });
        if (!cart) {
            cart = await this.prisma.cart.create({ data: { phone } });
        }

        // Upsert cart item (increment if exists)
        const existing = await this.prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
        });

        if (existing) {
            await this.prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + 1 },
            });
        } else {
            await this.prisma.cartItem.create({
                data: { cartId: cart.id, productId },
            });
        }

        // Get updated cart total
        const cartItems = await this.prisma.cartItem.findMany({
            where: { cartId: cart.id },
            include: { product: true },
        });
        const total = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

        return wa.sendButtons(
            phone,
            `✅ Added *${product.name}* to cart!\n\n🛒 Cart: ${itemCount} item${itemCount > 1 ? 's' : ''} — ₦${total.toLocaleString()}`,
            [
                { id: 'view_cart', title: '🛒 View Cart' },
                { id: 'checkout', title: '✅ Checkout' },
                { id: 'browse', title: '🔍 Keep Shopping' },
            ],
        );
    }

    /**
     * Show cart summary
     */
    private async showCart(phone: string, wa: WhatsappService) {
        const cart = await this.prisma.cart.findUnique({
            where: { phone },
            include: { items: { include: { product: true } } },
        });

        if (!cart || cart.items.length === 0) {
            return wa.sendButtons(
                phone,
                `Your cart is empty! 🛒\n\nBrowse our products to find something you love.`,
                [{ id: 'browse', title: '🔍 Browse Products' }],
            );
        }

        const items = cart.items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
        }));
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        return wa.sendCartSummary(phone, items, total);
    }

    /**
     * Clear cart
     */
    private async clearCart(phone: string, wa: WhatsappService) {
        const cart = await this.prisma.cart.findUnique({ where: { phone } });
        if (cart) {
            await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        return wa.sendButtons(
            phone,
            `🗑️ Cart cleared!\n\nReady to start fresh?`,
            [{ id: 'browse', title: '🔍 Browse Products' }],
        );
    }

    /**
     * Start checkout — ask for delivery address
     */
    private async startCheckout(phone: string, wa: WhatsappService) {
        const cart = await this.prisma.cart.findUnique({
            where: { phone },
            include: { items: { include: { product: true } } },
        });

        if (!cart || cart.items.length === 0) {
            return wa.sendButtons(
                phone,
                `Your cart is empty! Add some products first.`,
                [{ id: 'browse', title: '🔍 Browse Products' }],
            );
        }

        await this.setState(phone, 'AWAITING_ADDRESS');

        return wa.sendMessage(
            phone,
            `📍 *Delivery Details*\n\nPlease type your delivery address so we can send your order to you!\n\n_Example: 12 Admiralty Way, Lekki Phase 1, Lagos_`,
        );
    }

    /**
     * Process address and show order confirmation
     */
    private async processAddress(phone: string, address: string, wa: WhatsappService) {
        const cart = await this.prisma.cart.findUnique({
            where: { phone },
            include: { items: { include: { product: true } } },
        });

        if (!cart || cart.items.length === 0) {
            await this.setState(phone, 'BROWSING');
            return wa.sendMessage(phone, 'Your cart is empty!');
        }

        // Save address in context
        await this.setState(phone, 'CONFIRMING', address);

        let summary = `📋 *Order Summary*\n\n`;
        let total = 0;
        cart.items.forEach((i) => {
            const lineTotal = i.product.price * i.quantity;
            total += lineTotal;
            summary += `• ${i.quantity}x ${i.product.name} — ₦${lineTotal.toLocaleString()}\n`;
        });
        summary += `\n💰 *Total: ₦${total.toLocaleString()}*`;
        summary += `\n📍 *Deliver to:* ${address}`;
        summary += `\n🚚 Estimated: 2-3 business days`;
        summary += `\n\n💳 Tap *Pay Now* to complete your purchase`;

        return wa.sendButtons(phone, summary, [
            { id: 'pay_now', title: '💳 Pay Now' },
            { id: 'cancel_order', title: '❌ Cancel' },
        ]);
    }

    /**
     * Process mock payment — simulates Paystack-style payment
     */
    private async processPayment(phone: string, wa: WhatsappService) {
        const state = await this.getState(phone);
        const address = state.context || 'Address not provided';

        const cart = await this.prisma.cart.findUnique({
            where: { phone },
            include: { items: { include: { product: true } } },
        });

        if (!cart || cart.items.length === 0) {
            await this.setState(phone, 'BROWSING');
            return wa.sendMessage(phone, 'Your cart is empty!');
        }

        // Calculate total
        const total = cart.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

        // Generate payment reference
        const payRef = `PAY-${Date.now().toString(36).toUpperCase()}`;

        // Step 1: Sending "processing" message
        await wa.sendMessage(
            phone,
            `💳 *Processing Payment...*\n\n` +
            `Amount: ₦${total.toLocaleString()}\n` +
            `Reference: ${payRef}\n` +
            `Gateway: Paystack\n\n` +
            `⏳ Please wait...`,
        );

        // Step 2: Simulate payment processing delay
        await this.delay(3000);

        // Step 3: Payment "successful"
        await wa.sendMessage(
            phone,
            `✅ *Payment Successful!*\n\n` +
            `💰 ₦${total.toLocaleString()} received\n` +
            `🧾 Ref: ${payRef}\n` +
            `🏦 Via Paystack\n\n` +
            `Creating your order now...`,
        );

        await this.delay(1500);

        // Step 4: Create order
        const orderNum = `GLB-${Date.now().toString(36).toUpperCase()}`;

        await this.prisma.order.create({
            data: {
                orderNumber: orderNum,
                phone,
                deliveryAddress: address,
                subtotal: total,
                total,
                status: 'CONFIRMED',
                items: {
                    create: cart.items.map((i) => ({
                        quantity: i.quantity,
                        unitPrice: i.product.price,
                        itemName: i.product.name,
                        productId: i.product.id,
                    })),
                },
            },
        });

        // Clear cart
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

        // Reset state
        await this.setState(phone, 'IDLE');

        // Step 5: Send order confirmation
        return wa.sendOrderConfirmation(phone, orderNum, total, address);
    }

    /**
     * Cancel checkout
     */
    private async cancelCheckout(phone: string, wa: WhatsappService) {
        await this.setState(phone, 'BROWSING');

        return wa.sendButtons(
            phone,
            `No problem! Your cart is still saved. What would you like to do?`,
            [
                { id: 'view_cart', title: '🛒 View Cart' },
                { id: 'browse', title: '🔍 Keep Shopping' },
            ],
        );
    }

    // === HELPERS ===

    private async getState(phone: string) {
        let state = await this.prisma.conversationState.findUnique({ where: { phone } });
        if (!state) {
            state = await this.prisma.conversationState.create({
                data: { phone, state: 'IDLE' },
            });
        }
        return state;
    }

    private async setState(phone: string, newState: string, context?: string) {
        await this.prisma.conversationState.upsert({
            where: { phone },
            create: { phone, state: newState, context },
            update: { state: newState, context },
        });
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
