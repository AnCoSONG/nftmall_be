import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentStatus } from '../common/const';
import { getIdepmotentValue, sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
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
    order.backup_product_item_id = createOrderDto.product_item_id;
    return await sqlExceptionCatcher(this.orderRepository.save(order));
  }

  async findAll(with_releation?: boolean) {
    return await sqlExceptionCatcher(
      this.orderRepository.find({
        relations: with_releation ? ['product_item', 'buyer'] : [],
      }),
    );
  }

  async findOne(id: string, with_relation?: boolean) {
    const order = await sqlExceptionCatcher(
      this.orderRepository.findOne(id, {
        relations: with_relation ? ['product_item', 'buyer'] : [],
      }),
    );
    if (!order) {
      throw new NotFoundException(`Order with id ${id} was not found`);
    }
    return order;
  }

  async list(page: number, limit: number, with_releation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.orderRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_releation ? ['product_item', 'buyer'] : [],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return {
      data,
      total,
      page,
      limit,
    };
  }

  async cancel(id: string) {
    return await this.update(id, {
      payment_status: PaymentStatus.CANCELED,
      product_item_id: null, // 防止unique问题
    });
  }

  async paid(id: string, pay_timestamp: Date) {
    return await this.update(id, {
      payment_status: PaymentStatus.PAID,
      pay_timestamp: pay_timestamp,
    });
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
