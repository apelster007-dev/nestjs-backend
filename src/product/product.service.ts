import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProductListQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: { deletedAt: null } }),
    ]);

    return {
      data: items.map((p) => this.toResponse(p)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.toResponse(product);
  }

  async softDelete(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  toResponse(p: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: Decimal;
    stock: number;
    categoryId: string;
    category?: { id: string; name: string; slug?: string };
  }) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      categoryId: p.categoryId,
      category: p.category,
    };
  }
}
