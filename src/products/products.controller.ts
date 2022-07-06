import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { onChainStatus, SupportType } from '../common/const';
import { string } from 'joi';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('藏品系列')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  //! cannot create product sololy
  // 创建藏品系列时，需要手动输入正确的Publisher ID
  // @Post()
  // create(@Body() createProductDto: CreateProductDto) {
  //   return this.productsService.create(createProductDto);
  // }

  // @Get()
  // findAll() {
  //   return this.productsService.findAll();
  // }

  @Get('/query')
  @UseGuards(AdminGuard)
  listWithQuery(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
    @Query('id') id: string,
    @Query('name') name: string,
    @Query('types', new ParseArrayPipe({ items: String })) types: string[],
    @Query('on_chain_statuses', new ParseArrayPipe({ items: String }))
    on_chain_statuses: string[],
  ) {
    // console.log('/query', page, limit, with_relation, id, name, types, on_chain_statuses)
    return this.productsService.query(
      page,
      limit,
      with_relation,
      id,
      name,
      types,
      on_chain_statuses,
    );
  }

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
    @Query('scope') scope: string
  ) {
    return this.productsService.list(
      page,
      limit,
      with_relation,
      scope
    );
  }

  @Get('/get_stock_count')
  get_stock_count(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.get_stock_count(id);
  }

  @Patch('/setVisibility/:product_id')
  @UseGuards(AdminGuard)
  setVisibility(@Param('product_id') product_id: string, @Query('visibility', ParseBoolPipe) visibility: boolean) {
    return this.productsService.setVisibility(product_id, visibility)
  }

  // // 上链
  // @Get('/release/:id')
  // release(@Param('id', ParseIntPipe) id: string) {
  //   return this.productsService.release(+id);
  // }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('with_relation', ParseBoolPipe) with_relation?: boolean,
  ) {
    return this.productsService.findOne(id, with_relation);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
