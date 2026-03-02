import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import type { OrderJobPayload, OrderJobResult, OrderJobError } from './order.processor';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('order') private orderQueue: Queue,
  ) {}

  async createOrder(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const job = await this.orderQueue.add({ userId } as OrderJobPayload, {
      jobId: `order-${userId}-${Date.now()}`,
    });
    const result = await job.finished().catch((err) => {
      throw new BadRequestException(err?.message ?? 'Order processing failed');
    });

    const typed = result as OrderJobResult | OrderJobError;
    if ('failed' in typed && typed.failed) {
      throw new BadRequestException({
        message: typed.message,
        insufficientItems: typed.insufficientItems,
      });
    }
    const success = typed as OrderJobResult;

    const order = await this.prisma.order.findUnique({
      where: { id: success.orderId },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return this.toOrderResponse(order!);
  }

  async getOrder(id: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }
    return this.toOrderResponse(order);
  }

  async cancelOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
      for (const item of order.items) {
        await tx.$executeRaw(
          Prisma.sql`UPDATE "Product" SET stock = stock + ${item.quantity} WHERE id = ${item.productId}`,
        );
      }
    });

    const updated = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return this.toOrderResponse(updated!);
  }

  private toOrderResponse(order: {
    id: string;
    userId: string;
    status: OrderStatus;
    createdAt: Date;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      priceAtOrder: unknown;
      product?: { id: string; name: string; slug?: string };
    }>;
  }) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        priceAtOrder: Number(i.priceAtOrder),
        product: i.product,
      })),
    };
  }
}
