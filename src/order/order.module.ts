import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderProcessor } from './order.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'order',
      defaultJobOptions: {
        removeOnComplete: 100,
        attempts: 1,
        timeout: 15000,
      },
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
  exports: [OrderService],
})
export class OrderModule {}
