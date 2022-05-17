import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from '../guards/throttler-behind-proxy.guard';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { AffairService } from './affair.service';

@ApiTags('事务')
@Controller('affair')
export class AffairController {
  constructor(private readonly affairService: AffairService) {}

  // 发布藏品, <谁>发布一个<什么>产品
  @Post('/:id/publish')
  publish(
    @Param('id') publisher_id: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.affairService.publish(publisher_id, createProductDto);
  }

  //! remove in prod
  @Post('destory')
  destory(@Query('product_id') product_id: string) {
    //! danger method, delete a product and all cache related to it
    return this.affairService.destory(product_id);
  }

  @Post('clear')
  clearSeckillCache(@Query('product_id') product_id: string) {
    return this.affairService.clearSeckillCache(product_id);
  }

  //todo:DTO
  @Post('/seckill')
  seckill(@Body() seckillDto: { product_id: string; collector_id: number }) {
    return this.affairService.seckill(
      seckillDto.collector_id,
      seckillDto.product_id,
    );
  }

  //todo:DTO
  @Post('/draw')
  @Throttle(500, 60)
  @UseGuards(ThrottlerBehindProxyGuard)
  draw(@Body() drawDto: { product_id: string; collector_id: number }) {
    return this.affairService.participate_draw(
      drawDto.collector_id,
      drawDto.product_id,
    );
  }

  @Post('/pay')
  pay() {
    throw new NotImplementedException();
  }

  @Post('/simpay')
  simpay(@Query('order_id') order_id: string) {
    return this.affairService.payment_complete(order_id);
  }

  @Post('/cancel')
  cancel_payment(@Query('order_id') order_id: string) {
    return this.affairService.payment_cancel(order_id);
  }

  @Get('/stock/:id')
  stock(@Param('id') id: string) {
    return this.affairService.get_stock_count(id);
  }
}
