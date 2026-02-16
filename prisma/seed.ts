import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
    // === MAKEUP ===
    {
        name: 'Luxury Foundation Brush',
        description: 'Ultra-soft synthetic bristles for flawless foundation application. Ergonomic handle for effortless blending.',
        price: 8500,
        originalPrice: 12000,
        imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        category: 'Makeup',
    },
    {
        name: 'Matte Lipstick Set (6 Shades)',
        description: 'Long-lasting matte formula in 6 gorgeous shades. Waterproof and transfer-proof.',
        price: 15000,
        originalPrice: 22000,
        imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
        category: 'Makeup',
    },
    {
        name: 'Eyeshadow Palette - Sunset Glow',
        description: '18 highly pigmented shades from nude to bold. Matte, shimmer, and glitter finishes.',
        price: 12000,
        originalPrice: 18000,
        imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400',
        category: 'Makeup',
    },
    {
        name: 'Setting Spray - 24Hr Hold',
        description: 'Locks in your makeup for up to 24 hours. Lightweight, non-sticky formula.',
        price: 6500,
        originalPrice: 9000,
        imageUrl: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400',
        category: 'Makeup',
    },
    {
        name: 'Contour & Highlight Kit',
        description: '6-shade contour palette with mirror. Cream and powder formulas for sculpted looks.',
        price: 11000,
        originalPrice: 16000,
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
        category: 'Makeup',
    },
    // === SKINCARE ===
    {
        name: 'Vitamin C Brightening Serum',
        description: '20% Vitamin C serum with Hyaluronic Acid. Brightens, firms, and evens skin tone.',
        price: 18000,
        originalPrice: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        category: 'Skincare',
    },
    {
        name: 'Hydrating Face Moisturizer',
        description: 'Lightweight gel-cream with Aloe Vera and Shea Butter. For all skin types.',
        price: 9500,
        originalPrice: 14000,
        imageUrl: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400',
        category: 'Skincare',
    },
    {
        name: 'Charcoal Clay Face Mask',
        description: 'Deep cleansing mask that draws out impurities. Tightens pores and detoxifies.',
        price: 7000,
        originalPrice: 10000,
        imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400',
        category: 'Skincare',
    },
    {
        name: 'Sunscreen SPF 50+ (No White Cast)',
        description: 'Broad spectrum sun protection. Invisible finish on all skin tones. Water-resistant.',
        price: 12500,
        originalPrice: 17000,
        imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
        category: 'Skincare',
    },
    // === HAIR ===
    {
        name: 'Argan Oil Hair Treatment',
        description: 'Pure Moroccan Argan Oil. Repairs damage, adds shine, and tames frizz.',
        price: 14000,
        originalPrice: 20000,
        imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400',
        category: 'Hair',
    },
    {
        name: 'Deep Conditioning Hair Mask',
        description: 'Intensive repair mask with Keratin and Coconut Oil. For dry and damaged hair.',
        price: 8000,
        originalPrice: 12000,
        imageUrl: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400',
        category: 'Hair',
    },
    {
        name: 'Edge Control Gel - Strong Hold',
        description: 'Non-flaking, humidity-proof edge gel. Sleek finish that lasts all day.',
        price: 4500,
        originalPrice: 6500,
        imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
        category: 'Hair',
    },
];

async function main() {
    console.log('🌸 Seeding Glow Beauty products...');

    // Clear existing products
    await prisma.orderItem.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.conversationState.deleteMany();

    for (const product of products) {
        await prisma.product.create({ data: product });
        console.log(`  ✅ ${product.name} — ₦${product.price.toLocaleString()}`);
    }

    console.log(`\n🎉 Seeded ${products.length} products across 3 categories!`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
