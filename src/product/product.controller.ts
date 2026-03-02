import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private product: ProductService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all available products (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query() query: PaginationQueryDto) {
    return this.product.findAll({ page: query.page, limit: query.limit });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID including current stock' })
  async getOne(@Param('id') id: string) {
    return this.product.findOne(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a product (hides from catalog, orders unchanged)' })
  async softDelete(@Param('id') id: string) {
    return this.product.softDelete(id);
  }
}
