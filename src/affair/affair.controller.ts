import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from '../guards/throttler-behind-proxy.guard';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { AffairService } from './affair.service';
import { DrawDto, PayDto, SeckillDto, WxCallbackDto } from './common.dto';

@ApiTags('事务')
@Controller('affair')
export class AffairController {
  constructor(private readonly affairService: AffairService) {}

  // 发布藏品, <谁>发布一个<什么>产品
  @Post('/:publisher_id/publish')
  publish(
    @Param('publisher_id') publisher_id: string,
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

  @Post('/seckill')
  seckill(@Body() seckillDto: SeckillDto) {
    return this.affairService.seckill(
      seckillDto.collector_id,
      seckillDto.product_id,
    );
  }

  @Post('/draw')
  @Throttle(500, 60)
  @UseGuards(ThrottlerBehindProxyGuard)
  draw(@Body() drawDto: DrawDto) {
    return this.affairService.participate_draw(
      drawDto.collector_id,
      drawDto.product_id,
    );
  }

  @Post('/pay')
  pay(@Req() req: FastifyRequest, @Body() payDto: PayDto) {
    return this.affairService.pay(payDto.order_id, req.ip);
  }

  @Post('/paymentCallback')
  async payment_callback(
    @Res({ passthrough: false }) res: FastifyReply,
    @Body() body: WxCallbackDto,
  ) {
    // 可能会多次收到，如果已完成则直接返回200
    const ciphereRes = await this.affairService.payment_callback(body);
    if (ciphereRes.code === 0) {
      res.status(200).send();
    } else {
      res.status(500).send({
        code: 'FAIL',
        message: ciphereRes.error,
      });
    }
  }

  @Post('/sim_paymentComplete')
  payment_complete(
    @Query('order_id') order_id: string,
    @Query('out_trade_id') out_trade_id: string,
  ) {
    return this.affairService.payment_complete(order_id, out_trade_id);
  }

  @Post('/sim_paymentCancel')
  payment_cancel(@Query('order_id') order_id: string) {
    return this.affairService.payment_cancel(order_id);
  }

  @Get('/stock/:id')
  stock(@Param('id') id: string) {
    return this.affairService.get_stock_count(id);
  }
}
