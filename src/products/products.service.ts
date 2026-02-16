import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async getCategories(): Promise<string[]> {
        const products = await this.prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
        });
        return products.map((p) => p.category);
    }

    async getByCategory(category: string) {
        // SQLite LIKE is case-insensitive by default for ASCII
        return this.prisma.product.findMany({
            where: {
                category: { equals: category },
                inStock: true,
            },
        });
    }

    async search(query: string) {
        // SQLite LIKE is case-insensitive by default
        return this.prisma.product.findMany({
            where: {
                inStock: true,
                OR: [
                    { name: { contains: query } },
                    { description: { contains: query } },
                    { category: { contains: query } },
                ],
            },
            take: 5,
        });
    }

    async getById(id: string) {
        return this.prisma.product.findUnique({ where: { id } });
    }

    async getAll() {
        return this.prisma.product.findMany({ where: { inStock: true } });
    }
}
