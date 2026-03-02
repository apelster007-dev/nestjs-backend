import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private order: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart (user from token, atomic, reserves stock)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or empty cart' })
  async create(@CurrentUser() user: { id: string }) {
    return this.order.createOrder(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.order.getOrder(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order and restore stock' })
  async cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.order.cancelOrder(id, user.id);
  }
}
