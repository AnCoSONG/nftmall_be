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
  UseGuards,
} from '@nestjs/common';
import { ProductItemsService } from './product-items.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CollectorId } from '../decorators';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('藏品')
@Controller('product-items')
export class ProductItemsController {
  constructor(private readonly productItemsService: ProductItemsService) {}

  //! cannot create product-item sololy
  // @Post()
  // create(@Body() createProductItemDto: CreateProductItemDto) {
  //   return this.productItemsService.create(createProductItemDto);
  // }

  // @Get()
  // findAll(@Query('with_relation') with_relation: boolean) {
  //   return this.productItemsService.findAll(with_relation);
  // }

  @Get('/query')
  @ApiQuery({ name: 'id', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'owner', required: false })
  @UseGuards(AdminGuard)
  query(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation') with_relation: boolean,
    @Query('id') id: string,
    @Query('product_id') product_id: string,
    @Query('owner') owner: string,
  ) {
    // console.log(page, limit, with_relation, id, product_id, owner)
    return this.productItemsService.query(
      page,
      limit,
      with_relation,
      id,
      product_id,
      owner,
    );
  }

  @Get('/list')
  @UseGuards(JwtGuard)
  list(
    @CollectorId() collector_id: string,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation') with_relation: boolean,
  ) {
    return this.productItemsService.list(
      +collector_id,
      page,
      limit,
      with_relation,
    );
  }

  @Get('/get_collection_count')
  @UseGuards(JwtGuard)
  getCollectionCount(
    @CollectorId() collector_id: string,
    @Query('product_id') product_id: string,
  ) {
    return this.productItemsService.getCollectionCount(
      +collector_id,
      product_id,
    );
  }

  @Get('/findOneByUser/:id')
  @UseGuards(JwtGuard)
  findOneByUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('with_relation') with_relation: boolean,
    @CollectorId() collector_id: string,
  ) {
    return this.productItemsService.findOneByUser(
      id,
      collector_id,
      with_relation,
    );
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('with_relation') with_relation: boolean,
  ) {
    return this.productItemsService.findOne(id, with_relation);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductItemDto: UpdateProductItemDto,
  ) {
    return this.productItemsService.update(id, updateProductItemDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productItemsService.remove(id);
  }
}
