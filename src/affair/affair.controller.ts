import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CollectorId } from '../decorators';
import { JwtGuard } from '../auth/guards/jwt.guard';

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

  @Post('/addStock/:product_id')
  addStock(@Param('product_id') product_id: string, @Query('add_count', ParseIntPipe) add_count: number) {
    return this.affairService.add_stock(product_id, +add_count);
  }

  @Post('/syncStock/:product_id')
  syncStock(@Param('product_id') product_id: string) {
    return this.affairService.sync_stock(product_id);
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
  @UseGuards(JwtGuard)
  seckill(@CollectorId() collector_id: number, @Body() seckillDto: SeckillDto) {
    return this.affairService.seckill(
      collector_id,
      seckillDto.product_id,
    );
  }

  @Post('/draw')
  @Throttle(500, 60)
  @UseGuards(JwtGuard, ThrottlerBehindProxyGuard)
  draw(@CollectorId() collector_id: number, @Body() drawDto: DrawDto) {
    return this.affairService.participate_draw(
      collector_id,
      drawDto.product_id,
    );
  }

  @Post('/pay')
  pay(@Req() req: FastifyRequest, @Body() payDto: PayDto) {
    return this.affairService.pay(payDto.order_id, req.ip, payDto.type, payDto.openid);
  }

  @Get('/queryPayment')
  queryPayment(@Query('trade_no') trade_no: string) {
    return this.affairService.fetch_payment_result(trade_no);
  }

  @Post('/paymentCallback')
  async payment_callback(
    @Res({ passthrough: false }) res: FastifyReply,
    @Body() body: WxCallbackDto,
  ) {
    // 可能会多次收到，如果已完成则直接返回200
    const ciphereRes = await this.affairService.payment_callback(body);
    if (ciphereRes.code === 0 || ciphereRes.code === 1 || ciphereRes.code === -1) {
      res.status(200).send();
    } else {
      res.status(500).send({
        code: 'FAIL',
        message: ciphereRes.message
      });
    }
  }

  @Post('/manual_createNftForProductItem')
  create_nft_for_product_item(@Query('order_id') order_id: string) {
    return this.affairService.create_nft_for_product_item(order_id);
  }

  @Post('/manual_createNftClassForProduct')
  create_nft_class_for_product(@Query('product_id') product_id: string) {
    return this.affairService.create_nft_class_id_for_product(product_id);
  }

  @Post('/manual_genLuckySet')
  gen_lucky_set(@Query('product_id') product_id: string, @Query('count', ParseIntPipe) count: number) {
    if (count <= 0) {
      throw new BadRequestException(`count cannot less than 1`)
    }
    return this.affairService.genLuckySet(product_id, count);
  }

  @Post('/sim_paymentComplete')
  payment_complete(
    @Query('order_id') order_id: string,
    @Query('out_trade_id') out_trade_id: string,
  ) {
    return this.affairService.payment_complete(order_id, out_trade_id);
  }

  @Post('/orderCancel')
  @UseGuards(JwtGuard)
  payment_cancel(@Query('order_id') order_id: string) {
    return this.affairService.payment_cancel(order_id);
  }

  @Get('/stock/:product_id')
  stock(@Param('product_id') product_id: string, @Query('db') db: string) {
    return this.affairService.get_stock_count(product_id, db);
  }
}
