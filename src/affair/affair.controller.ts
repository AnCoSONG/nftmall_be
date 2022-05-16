import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { number, string } from 'joi';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { AffairService } from './affair.service';

@ApiTags('事务')
@Controller('affair')
export class AffairController {
  constructor(private readonly affairService: AffairService) {}

  // 发布藏品, <谁>发布一个<什么>产品
  @Post('publish')
  publish(
    @Query('publisher_id') publisher_id: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.affairService.publish(publisher_id, createProductDto);
  }

  @Post('/test')
  test(@Query('buyer_id') id: number, @Query('product_id') product_id: string) {
    return this.affairService.seckill(id, product_id);
  }
}
