import { Test, TestingModule } from '@nestjs/testing';
import { Module, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { OrderModule } from '../src/order/order.module';

@Module({})
class OrderModuleMock {}

/**
 * E2E tests for public and core endpoints.
 * OrderModule is replaced to avoid requiring Redis in CI; order flow is covered by unit tests.
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(OrderModule)
      .useModule(OrderModuleMock)
      .overrideProvider(PrismaService)
      .useValue({
        user: { findUnique: jest.fn(), create: jest.fn() },
        category: { findMany: jest.fn(), findUnique: jest.fn() },
        product: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
        cart: { findUnique: jest.fn(), create: jest.fn() },
        cartItem: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
        order: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        orderItem: { create: jest.fn() },
        $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({}),
        $queryRaw: jest.fn(),
        $executeRaw: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    prisma = moduleFixture.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/products (GET) returns 200', () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual([]);
        expect(res.body.meta).toBeDefined();
      });
  });

  it('/categories (GET) returns 200', () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
    return request(app.getHttpServer()).get('/categories').expect(200);
  });
});
