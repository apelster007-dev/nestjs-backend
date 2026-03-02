import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

const mockPrisma = {
  cart: { findUnique: jest.fn() },
  order: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('order'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should throw when cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      await expect(service.createOrder('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw when cart has no items', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ items: [] });
      await expect(service.createOrder('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return 400 when job returns insufficient stock', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ items: [{ productId: 'p1', quantity: 10 }] });
      const job = { finished: () => Promise.resolve({ failed: true, message: 'Insufficient stock', insufficientItems: [] }) };
      mockQueue.add.mockResolvedValue(job);
      await expect(service.createOrder('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return order when job succeeds', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ items: [{ productId: 'p1', quantity: 1 }] });
      const job = {
        finished: () =>
          Promise.resolve({
            orderId: 'order-1',
            status: OrderStatus.PENDING,
            items: [],
            createdAt: new Date(),
          }),
      };
      mockQueue.add.mockResolvedValue(job);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        items: [{ productId: 'p1', quantity: 1, priceAtOrder: 9.99, product: { id: 'p1', name: 'Product' } }],
      });
      const result = await service.createOrder('user-1');
      expect(result.id).toBe('order-1');
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('getOrder', () => {
    it('should throw when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getOrder('order-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should forbid viewing another user order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'other-user' });
      await expect(service.getOrder('order-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelOrder', () => {
    it('should throw when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.cancelOrder('order-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should forbid cancelling another user order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'other-user', items: [] });
      await expect(service.cancelOrder('order-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
