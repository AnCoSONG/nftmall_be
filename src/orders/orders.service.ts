import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { onChainStatus, PaymentStatus } from '../common/const';
import { getIdepmotentValue, sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
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

  async findByTradeNo(trade_no: string, with_relation: boolean) {
    return await sqlExceptionCatcher(
      this.orderRepository.find({
        order: { update_date: 'DESC' },
        where: { trade_no },
        relations: with_relation ? ['product_item', 'buyer', 'product_item.product']: []
      }),
    );
  }

  async findOne(id: string, with_relation?: boolean) {
    const order = await sqlExceptionCatcher(
      this.orderRepository.findOne(id, {
        relations: with_relation
          ? ['product_item', 'buyer', 'product_item.product']
          : [],
      }),
    );
    if (!order) {
      throw new NotFoundException(`Order with id ${id} was not found`);
    }
    return order;
  }

  async list(
    collector_id: number,
    page: number,
    limit: number,
    with_releation = false,
    query: 'all' & onChainStatus & PaymentStatus,
  ) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    if (query === 'all') {
      const [data, total] = await sqlExceptionCatcher(
        this.orderRepository.findAndCount({
          order: { update_date: 'DESC' },
          relations: with_releation
            ? ['product_item', 'buyer', 'product_item.product']
            : [],
          where: {
            buyer_id: collector_id,
          },
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
    } else if (
      query === 'all' ||
      query === 'unpaid' ||
      query === 'canceled' ||
      query === 'paid'
    ) {
      const [data, total] = await sqlExceptionCatcher(
        this.orderRepository.findAndCount({
          order: { update_date: 'DESC' },
          relations: with_releation
            ? ['product_item', 'buyer', 'product_item.product']
            : [],
          where: {
            buyer_id: collector_id,
            payment_status: query,
          },
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
    } else {
      const [data, total] = await sqlExceptionCatcher(
        this.orderRepository.findAndCount({
          order: { update_date: 'DESC' },
          relations: with_releation
            ? ['product_item', 'buyer', 'product_item.product']
            : ['product_item', 'product_item.product'],
          where: {
            buyer_id: collector_id,
            payment_status: 'paid',
            product_item: {
              on_chain_status: query,
            },
          },
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
  }

  async cancel(id: string) {
    return await this.update(id, {
      payment_status: PaymentStatus.CANCELED,
      product_item_id: null, // 防止unique问题
    });
  }

  async paid(
    id: string,
    pay_timestamp: Date,
    out_trade_id: string,
    gen_credit: number,
  ) {
    return await this.update(id, {
      payment_status: PaymentStatus.PAID,
      pay_timestamp: pay_timestamp,
      out_trade_id,
      gen_credit,
    });
  }

  /**
   * 某用户是否已购买某产品
   * 查看订单内product_id对应的order是否已支付
   * @param product_id
   * @param buyer_id
   * @returns false not paid or not found true paid
   */
  async is_paid(product_id: string, buyer_id: string) {
    const res = await sqlExceptionCatcher(
      this.orderRepository
        .createQueryBuilder('order')
        .where('buyer_id = :buyer_id', { buyer_id })
        .leftJoinAndSelect('order.product_item', 'product_item')
        .where('product_item.product_id = :product_id', { product_id })
        .andWhere('order.payment_status = :payment_status', {
          payment_status: PaymentStatus.PAID,
        })
        .getCount(),
    );
    if (!res) {
      return false;
    }
    return res === 1;
  }

  async is_unpaid(product_id: string, buyer_id: number) {
    const res = await sqlExceptionCatcher(
      this.orderRepository.find({
        order: { update_date: 'DESC' },
        relations: ['product_item', 'product_item.product'],
        where: {
          buyer_id: buyer_id,
          product_item: {
            product_id: product_id,
          },
          payment_status: PaymentStatus.UNPAID,
        },
      }) as Promise<Order[]>,
    );
    if (res.length === 1) {
      return {
        code: 1, // 有未支付
        order_id: res[0].id,
      };
    } else if (res.length === 0) {
      return {
        code: 0,
      };
    } else {
      throw new InternalServerErrorException('db error, multiple unpaid order');
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);
    const merged = this.orderRepository.merge(order, updateOrderDto);
    return await sqlExceptionCatcher(this.orderRepository.save(merged));
  }

  async get_order_payment_status(order_id: string) {
    const order = await this.findOne(order_id);
    return order.payment_status;
  }

  async remove(id: string) {
    //! hard remove, danger
    const order = await this.findOne(id);
    return await sqlExceptionCatcher(this.orderRepository.remove(order));
  }
}
