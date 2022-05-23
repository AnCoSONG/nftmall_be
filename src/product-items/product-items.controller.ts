import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductItemsService } from './product-items.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('藏品')
@Controller('product-items')
export class ProductItemsController {
  constructor(private readonly productItemsService: ProductItemsService) {}

  //! cannot create product-item sololy
  // @Post()
  // create(@Body() createProductItemDto: CreateProductItemDto) {
  //   return this.productItemsService.create(createProductItemDto);
  // }

  @Get()
  findAll(@Query('with_relation') with_relation: boolean) {
    return this.productItemsService.findAll(with_relation);
  }

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation') with_relation: boolean,
  ) {
    return this.productItemsService.list(page, limit, with_relation);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('with_relation') with_relation: boolean,
  ) {
    return this.productItemsService.findOne(id, with_relation);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductItemDto: UpdateProductItemDto,
  ) {
    return this.productItemsService.update(id, updateProductItemDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productItemsService.remove(id);
  }
}
