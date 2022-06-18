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
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CollectorId } from '../decorators';

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

  @Get('/query')
  @ApiQuery({name: 'id', required: false})
  @ApiQuery({name: 'product_id', required: false})
  @ApiQuery({name: 'owner', required: false})
  query(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation') with_relation: boolean,
    @Query('id') id: string,
    @Query('product_id') product_id: string,
    @Query('owner') owner: string
  ) {
    // console.log(page, limit, with_relation, id, product_id, owner)
    return this.productItemsService.query(page, limit, with_relation, id, product_id, owner)
  }


  @Get('/list/:collector_id')
  list(
    @CollectorId() collector_id: number,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation') with_relation: boolean,
  ) {
    return this.productItemsService.list(collector_id, page, limit, with_relation);
  }
  @Get('/get_collection_count/:collector_id')
  getCollectionCount(@Param('collector_id') collector_id: number, @Query('product_id') product_id: string) {
    return this.productItemsService.getCollectionCount(collector_id, product_id);
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
