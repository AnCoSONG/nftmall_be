import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { IncrementProductDto } from '../products/dto/increment-product.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('事务')
@Controller('affair')
export class AffairController {
  constructor(private readonly affairService: AffairService) {}

  // 发布藏品, <谁>发布一个<什么>产品
  @Post('/publish/:publisher_id')
  @UseGuards(AdminGuard)
  publish(
    @Param('publisher_id') publisher_id: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.affairService.publish(publisher_id, createProductDto);
  }

  @Post('/increment/:product_id')
  @UseGuards(AdminGuard)
  increment_publish(
    @Param('product_id') product_id: string,
    @Body() incrementProductDto: IncrementProductDto,
  ) {
    return this.affairService.incremental_publish(
      product_id,
      incrementProductDto.count,
      incrementProductDto.published_count,
      incrementProductDto.draw_timestamp,
      incrementProductDto.draw_end_timestamp,
      incrementProductDto.sale_timestamp,
    );
  }

  @Post('/sendGift/:product_id')
  @UseGuards(AdminGuard)
  sendGift(@Param('product_id') product_id: string, @Query('collector_id', ParseIntPipe) collector_id: number) {
    return this.affairService.send_product_item_to_collector(product_id, collector_id)
  }

  // @Post('/addStock/:product_id')
  // addStock(
  //   @Param('product_id') product_id: string,
  //   @Query('add_count', ParseIntPipe) add_count: number,
  // ) {
  //   return this.affairService.add_stock(product_id, +add_count);
  // }

  @Post('/syncStock/:product_id')
  @UseGuards(AdminGuard)
  syncStock(@Param('product_id') product_id: string) {
    return this.affairService.sync_stock(product_id);
  }

  //! remove in prod
  @Delete('destory/:product_id')
  @UseGuards(AdminGuard)
  destory(@Param('product_id') product_id: string) {
    //! danger method, delete a product and all cache related to it
    return this.affairService.destory(product_id);
  }

  @Post('clear')
  @UseGuards(AdminGuard)
  clearSeckillCache(@Query('product_id') product_id: string) {
    return this.affairService.clearSeckillCache(product_id);
  }

  @Post('/seckill')
  @UseGuards(JwtGuard)
  seckill(@CollectorId() collector_id: number, @Body() seckillDto: SeckillDto) {
    return this.affairService.seckill(collector_id, seckillDto.product_id);
  }

  // @Get('/seckill_test/:collector_id/:product_id')
  // seckill_test(@Param('collector_id', ParseIntPipe) collector_id: number, @Param('product_id') product_id: string) {
  //   return this.affairService.seckill_test(collector_id, product_id)
  // }

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
  @UseGuards(JwtGuard)
  pay(@Req() req: FastifyRequest, @Body() payDto: PayDto) {
    return this.affairService.pay(
      payDto.order_id,
      req.ip,
      payDto.type,
      payDto.openid,
    );
  }

  @Get('/queryPayment')
  @UseGuards(JwtGuard)
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
    if (
      ciphereRes.code === 0 ||
      ciphereRes.code === 1 ||
      ciphereRes.code === -1
    ) {
      res.status(200).send();
    } else {
      res.status(500).send({
        code: 'FAIL',
        message: ciphereRes.message,
      });
    }
  }

  @Post('/manual_createNftForProductItem/:order_id')
  @UseGuards(AdminGuard)
  create_nft_for_product_item(@Param('order_id') order_id: string) {
    return this.affairService.create_nft_for_product_item(order_id);
  }

  @Post('/manual_createNftClassForProduct/:product_id')
  @UseGuards(AdminGuard)
  create_nft_class_for_product(@Param('product_id') product_id: string) {
    return this.affairService.create_nft_class_id_for_product(product_id);
  }

  @Post('/manual_genLuckySet')
  @UseGuards(AdminGuard)
  gen_lucky_set(
    @Query('product_id') product_id: string,
    @Query('count', ParseIntPipe) count: number,
  ) {
    if (count <= 0) {
      throw new BadRequestException(`count cannot less than 1`);
    }
    return this.affairService.genLuckySet(product_id, count);
  }

  @Get('/isLuckySetGen')
  @UseGuards(AdminGuard)
  is_lucky_set_gen(@Query('product_id') product_id: string) {
    return this.affairService.is_lucky_set_gen(product_id);
  }

  @Get('/getDrawSetCount')
  @UseGuards(AdminGuard)
  get_lucky_set_count(@Query('product_id') product_id: string) {
    return this.affairService.get_draw_set_count(product_id);
  }

  @Post('/sim_paymentComplete')
  @UseGuards(AdminGuard)
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
