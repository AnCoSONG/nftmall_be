import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductItemsService } from './product-items.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';

@Controller('product-items')
export class ProductItemsController {
  constructor(private readonly productItemsService: ProductItemsService) {}

  @Post()
  create(@Body() createProductItemDto: CreateProductItemDto) {
    return this.productItemsService.create(createProductItemDto);
  }

  @Get()
  findAll() {
    return this.productItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productItemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductItemDto: UpdateProductItemDto) {
    return this.productItemsService.update(+id, updateProductItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productItemsService.remove(+id);
  }
}
