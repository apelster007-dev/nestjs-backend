import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart contents (user from token)' })
  async get(@CurrentUser() user: { id: string }) {
    return this.cart.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (or update quantity if exists)' })
  async addItem(@CurrentUser() user: { id: string }, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(user.id, dto.productId, dto.quantity);
  }

  @Put('items/:productId')
  @ApiOperation({ summary: 'Update item quantity' })
  async updateItem(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@CurrentUser() user: { id: string }, @Param('productId') productId: string) {
    return this.cart.removeItem(user.id, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clear(@CurrentUser() user: { id: string }) {
    return this.cart.clearCart(user.id);
  }
}
