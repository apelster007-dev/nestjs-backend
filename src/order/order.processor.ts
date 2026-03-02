import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

export interface OrderJobPayload {
  userId: string;
}

export interface OrderJobResult {
  orderId: string;
  status: OrderStatus;
  items: Array<{ productId: string; quantity: number; priceAtOrder: number }>;
  createdAt: Date;
}

export interface OrderJobError {
  failed: true;
  message: string;
  insufficientItems?: Array<{ productId: string; productName: string; requested: number; available: number }>;
}

@Processor('order')
export class OrderProcessor {
  constructor(private prisma: PrismaService) {}

  @Process({ concurrency: 1 })
  async handleOrderCreation(job: Job<OrderJobPayload>): Promise<OrderJobResult | OrderJobError> {
    const { userId } = job.data;
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      return { failed: true, message: 'Cart is empty' };
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const productIds = [...new Set(cart.items.map((i) => i.productId))];
const lockedProducts = await tx.$queryRaw<
          Array<{ id: string; name: string; stock: number; price: string }>
        >(Prisma.sql`
        SELECT id, name, stock, price FROM "Product"
        WHERE id IN (${Prisma.join(productIds)})
        AND "deletedAt" IS NULL
        FOR UPDATE
      `);
        const productMap = new Map(lockedProducts.map((p) => [p.id, p]));

        const insufficient: OrderJobError['insufficientItems'] = [];
        for (const item of cart.items) {
          const product = productMap.get(item.productId);
          if (!product) {
            insufficient.push({
              productId: item.productId,
              productName: '[Deleted or missing]',
              requested: item.quantity,
              available: 0,
            });
            continue;
          }
          if (product.stock < item.quantity) {
            insufficient.push({
              productId: product.id,
              productName: product.name,
              requested: item.quantity,
              available: product.stock,
            });
          }
        }
        if (insufficient.length > 0) {
          throw new OrderInsufficientStockError(
            'Insufficient stock for one or more items',
            insufficient,
          );
        }

        const order = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.PENDING,
          },
        });

        for (const item of cart.items) {
          const product = productMap.get(item.productId)!;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtOrder: product.price,
            },
          });
await tx.$executeRaw(
          Prisma.sql`UPDATE "Product" SET stock = stock - ${item.quantity} WHERE id = ${item.productId}`,
        );
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return {
          orderId: order.id,
          status: order.status,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            priceAtOrder: Number(productMap.get(i.productId)!.price),
          })),
          createdAt: order.createdAt,
        };
      });
    } catch (err) {
      if (err instanceof OrderInsufficientStockError) {
        return {
          failed: true,
          message: err.message,
          insufficientItems: err.insufficientItems,
        };
      }
      throw err;
    }
  }
}

class OrderInsufficientStockError extends Error {
  constructor(
    message: string,
    public insufficientItems: OrderJobError['insufficientItems'],
  ) {
    super(message);
    this.name = 'OrderInsufficientStockError';
  }
}
