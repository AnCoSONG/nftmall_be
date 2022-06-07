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
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags } from '@nestjs/swagger';
import { onChainStatus, PaymentStatus } from '../common/const';
import { CollectorId } from '../decorators';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('订单')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  //! cannot create order sololy, order is created when collector seckill the product
  // @Post()
  // create(@Body() createOrderDto: CreateOrderDto) {
  //   return this.ordersService.create(createOrderDto);
  // }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // @Get('/list')
  // list(
  //   @Query('page', ParseIntPipe) page: number,
  //   @Query('limit', ParseIntPipe) limit: number,
  //   @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  //   @Query('query') query: 'all' & PaymentStatus & onChainStatus
  // ) {
  //   return this.ordersService.list(page, limit, with_relation, query);
  // }
  @Get('/list')
  listByCollector(
    @CollectorId() collector_id: number,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
    @Query('query') query: 'all' & PaymentStatus & onChainStatus
  ) {
    return this.ordersService.list(collector_id, page, limit, with_relation, query);
  }

  @Get('/byTradeNo')
  findByTradeNo(@Query('trade_no') trade_no: string, @Query('with_relation') with_relation: boolean) {
    return this.ordersService.findByTradeNo(trade_no, with_relation);
  }

  @Get('/fetchPaymentStatus')
  @UseGuards(JwtGuard)
  fetchPaymentStatus(@Query('order_id') order_id: string) {
    return this.ordersService.get_order_payment_status(order_id);
  }

  @Get('/is_paid')
  isPaid(
    @Query('collector_id') collector_id: string,
    @Query('product_id') product_id: string,
  ) {
    return this.ordersService.is_paid(product_id, collector_id);
  }

  @Get('/is_unpaid')
  isUnpaid(
    @Query('collector_id') collector_id: number,
    @Query('product_id') product_id: string,
  ) {
    return this.ordersService.is_unpaid(product_id, collector_id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.ordersService.findOne(id, with_relation);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
