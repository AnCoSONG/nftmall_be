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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags } from '@nestjs/swagger';

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

  @Get('/list')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('with_relation', ParseBoolPipe) with_relation: boolean,
  ) {
    return this.ordersService.list(page, limit, with_relation);
  }

  @Get('/is_paid')
  isPaid(
    @Query('product_id') product_id: string,
    @Query('collector_id') collector_id: string,
  ) {
    return this.ordersService.is_paid(product_id, collector_id);
  }

  @Get('/is_unpaid')
  isUnpaid(
    @Query('product_id') product_id: string,
    @Query('collector_id') collector_id: string,
  ) {
    return this.ordersService.is_unpaid(product_id, collector_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
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
