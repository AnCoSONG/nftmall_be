import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getIdepmotentValue, sqlExceptionCatcher } from '../common/utils';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}
  async create(createOrderDto: CreateOrderDto) {
    const order = this.orderRepository.create(createOrderDto);
    order.trade_no = getIdepmotentValue() + getIdepmotentValue();
    return await sqlExceptionCatcher(this.orderRepository.save(order));
  }

  async findAll() {
    return await sqlExceptionCatcher(this.orderRepository.find());
  }

  async findOne(id: string) {
    const order = await sqlExceptionCatcher(this.orderRepository.findOne(id));
    if (!order) {
      throw new NotFoundException(`Order with id ${id} was not found`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);
    const merged = this.orderRepository.merge(order, updateOrderDto);
    return await sqlExceptionCatcher(this.orderRepository.save(merged));
  }

  async remove(id: string) {
    //! hard remove, danger
    const order = await this.findOne(id);
    return await sqlExceptionCatcher(this.orderRepository.remove(order));
  }
}
