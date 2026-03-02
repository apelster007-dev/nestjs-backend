import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Categories')
@Public()
@Controller('categories')
export class CategoryController {
  constructor(private category: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all product categories' })
  async list() {
    return this.category.findAll();
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'List products in a category' })
  async products(@Param('id') id: string) {
    return this.category.findProducts(id);
  }
}
