import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
    if (!cart) return { userId, items: [] };
    const items = cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      product: i.product.deletedAt
        ? { id: i.product.id, name: '[Deleted Product]', price: Number(i.product.price), stock: 0 }
        : {
            id: i.product.id,
            name: i.product.name,
            slug: i.product.slug,
            price: Number(i.product.price),
            stock: i.product.stock,
          },
    }));
    return { userId: cart.userId, items };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    if (quantity < 1) throw new BadRequestException('Quantity must be at least 1');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity < 0) throw new BadRequestException('Quantity cannot be negative');
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return this.getCart(userId);
    if (quantity === 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
      return this.getCart(userId);
    }
    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!item) throw new NotFoundException('Item not in cart');
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return this.getCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { userId, items: [] };
  }

  /** Used by OrderService: get cart with items for order processing */
  async getCartForOrder(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    return cart;
  }
}
