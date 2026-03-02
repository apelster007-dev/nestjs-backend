import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async findProducts(id: string) {
    await this.findOne(id);
    const products = await this.prisma.product.findMany({
      where: { categoryId: id, deletedAt: null },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      categoryId: p.categoryId,
      category: p.category,
    }));
  }
}
