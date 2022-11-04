import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseBoolPipe, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProductItemTransferService } from './product-item-transfer.service';
import { CreateProductItemTransferDto } from './dto/create-product-item-transfer.dto';
import { UpdateProductItemTransferDto } from './dto/update-product-item-transfer.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CollectorId } from '../decorators';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('藏品转赠')
@Controller('product-item-transfer')
export class ProductItemTransferController {
  constructor(private readonly productItemTransferService: ProductItemTransferService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createProductItemTransferDto: CreateProductItemTransferDto) {
    return this.productItemTransferService.create(createProductItemTransferDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiQuery({ name: 'with_relation', required: false, type: Boolean })
  findAll(@Query('with_relation') with_relation?: boolean) {
    return this.productItemTransferService.findAll(with_relation);
  }

  // todo: query

  @Get('list')
  @UseGuards(JwtGuard)
  list(
    @CollectorId() collectorId: string,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.productItemTransferService.list(+collectorId, page, limit, with_relation);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiQuery({ name: 'with_relation', required: false, type: Boolean })
  findOne(@Param('id') id: string, @Query('with_relation') with_relation?: boolean) {
    return this.productItemTransferService.findOne(id, with_relation);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateProductItemTransferDto: UpdateProductItemTransferDto) {
    return this.productItemTransferService.update(id, updateProductItemTransferDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.productItemTransferService.remove(id);
  }
}
