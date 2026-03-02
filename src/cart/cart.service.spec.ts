import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  cart: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  cartItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addItem', () => {
    it('should reject quantity < 1', async () => {
      await expect(service.addItem('user-1', 'product-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.addItem('user-1', 'product-1', -1)).rejects.toThrow(BadRequestException);
    });

    it('should throw if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(service.addItem('user-1', 'product-1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should create cart and add item when cart does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-1', deletedAt: null });
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({});
      mockPrisma.cart.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        userId: 'user-1',
        items: [{ productId: 'product-1', quantity: 1, product: { id: 'product-1', name: 'P', price: 10, stock: 5, deletedAt: null } }],
      });
      const result = await service.addItem('user-1', 'product-1', 1);
      expect(result.userId).toBe('user-1');
      expect(result.items).toHaveLength(1);
      expect(mockPrisma.cart.create).toHaveBeenCalled();
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', productId: 'product-1', quantity: 1 },
      });
    });
  });

  describe('updateItem', () => {
    it('should reject negative quantity', async () => {
      await expect(service.updateItem('user-1', 'product-1', -1)).rejects.toThrow(BadRequestException);
    });
  });
});
