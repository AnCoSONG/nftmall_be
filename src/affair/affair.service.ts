import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { BsnService } from '../bsn/bsn.service';
import { CollectorsService } from '../collectors/collectors.service';
import { Collector } from '../collectors/entities/collector.entity';
import { PaymentStatus } from '../common/const';
import { sqlExceptionCatcher } from '../common/utils';
import { DayjsService } from '../lib/dayjs/dayjs.service';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductItem } from '../product-items/entities/product-item.entity';
import { ProductItemsService } from '../product-items/product-items.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { PublishersService } from '../publishers/publishers.service';

@Injectable()
export class AffairService {
  private readonly logger = new Logger(AffairService.name);
  constructor(
    @InjectQueue('affair') private readonly affairQueue: Queue,
    private readonly bsnService: BsnService,
    private readonly publisherService: PublishersService,
    private readonly productsService: ProductsService,
    private readonly productItemsService: ProductItemsService,
    private readonly collectorService: CollectorsService,
    private readonly dayjsService: DayjsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly ordersService: OrdersService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async publish(publisher_id: string, createProductDto: CreateProductDto) {
    //* 检查是否存在该id
    const publisher = await sqlExceptionCatcher(
      this.publisherService.findOne(publisher_id),
    );
    //* 创建一个product
    createProductDto.publisher_id = publisher.id;
    const createProductRes = await this.productsService.create(
      createProductDto,
    );
    const createNftClassRes = await this.bsnService.create_nft_class({
      owner: publisher.bsn_address,
      name: createProductRes.name,
    });
    if (createNftClassRes.code) {
      throw new BadRequestException(
        'bsnService.create_nft_class failed ' + createNftClassRes.message,
      );
    }
    this.logger.log(
      'create-nft-class-operation-id: ' + createNftClassRes.operation_id,
    );

    //* 上链，生成链上nft class id并异步写入product，为之后product创建product item上链做准备（因为上链发行nft必须要nft class)
    this.affairQueue.add(
      'update-nft-class-id',
      {
        product_id: createProductRes.id,
        operation_id: createNftClassRes.operation_id,
      },
      {
        delay: 3000,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        attempts: 10,
        timeout: 30000,
        // removeOnComplete: true,
      },
    );

    //* 创建product items
    this.affairQueue.add(
      'create-product-items',
      {
        product_id: createProductRes.id,
        count: createProductRes.publish_count,
      },
      {
        delay: 3000,
      },
    );
    // * 创建redis抢购所需数据类型
    // * seckill:stock:<product_id> 记录库存
    // * seckill:sale_timestamp:<product_id> 记录开售时间
    // * seckill:drawset:<product_id> 记录抽签集合
    // * seckill:luckyset:<product_id> 通过srandmember得到
    await Promise.all([
      this.redis.set(
        `seckill:stock:${createProductRes.id}`,
        createProductRes.publish_count,
      ),
      this.redis.set(
        `seckill:sale_timestamp:${createProductRes.id}`,
        createProductRes.sale_timestamp.valueOf(),
      ),
    ]);

    // 抽签结束回调，生成lucky set供购买时检查
    this.schedulerRegistry.addTimeout(
      `seckill:drawend:${createProductRes.id}`,
      setTimeout(async () => {
        // console.log(createProductRes.id, createProductRes.publish_count);
        const res = await this.get_lucky_set(
          createProductRes.id,
          createProductRes.publish_count * 2, // todo: 抽到的要比实际发售的多，这里设置为2倍
        );
        if (res === -1) {
          this.logger.error('Nobody draw...');
        } else {
          this.logger.log('Lucky set generated');
        }
        // 完成后清空timeout
        try {
          this.schedulerRegistry.deleteTimeout(
            `seckill:drawend:${createProductRes.id}`,
          );
        } catch (e) {
          this.logger.error(
            `seckill:drawend:${createProductRes.id} not found: ${e}`,
          );
        }
      }, this.dayjsService.dayjsify(createProductRes.draw_end_timestamp) - this.dayjsService.dayjsify()),
    );

    //* 生成假数据
    //! 后期去掉！
    this.schedulerRegistry.addTimeout(
      `seckill:draw:${createProductRes.id}`,
      setTimeout(async () => {
        await Promise.all([
          this.participate_draw(1, createProductRes.id),
          this.participate_draw(2, createProductRes.id),
          this.participate_draw(3, createProductRes.id),
        ]);
        this.logger.log('Fake data generated');
        try {
          this.schedulerRegistry.deleteTimeout(
            `seckill:draw:${createProductRes.id}`,
          );
        } catch (e) {
          this.logger.error(
            `seckill:draw:${createProductRes.id} not found: ${e}`,
          );
        }
      }, this.dayjsService.dayjsify(createProductRes.draw_timestamp) - this.dayjsService.dayjsify()),
    );

    return {
      operation_id: createNftClassRes.operation_id,
      createProductRes,
    };
  }

  // queue:status:<job_name>:<product_id>
  async get_status(redis_task_key: string) {
    return await this.redis.get(redis_task_key);
  }

  async get_stock_count(product_id: string) {
    return await this.redis.get(`seckill:stock:${product_id}`);
  }

  /**
   * 获取参与抽签的人数
   * @returns 当前任务抽签人数，键不存在返回0
   */
  async get_drawer_count(product_id: string) {
    return await this.redis.scard(`seckill:drawset:${product_id}`);
  }

  /**
   * 参与抽签
   * @param collector_id 用户id
   * @param product_id 藏品id
   * @returns code 0 成功 code 1 没有钱包 2
   */
  async participate_draw(collector_id: number, product_id: string) {
    // 检查是否存在
    const collector = (await this.collectorService
      .findOne(collector_id)
      .catch((err) => {
        this.logger.error(err);
        return null;
      })) as Collector | null;
    if (!collector) {
      return {
        code: 3,
        message: 'collector not found',
      };
    }
    if (!collector.bsn_address) {
      return {
        code: 1,
        message: 'collector must has bsn account first',
      };
    }
    // 参与用户
    const drawRes = await this.redis.sadd(
      `seckill:drawset:${product_id}`,
      collector_id,
    );
    if (drawRes === 1) {
      return {
        code: 0,
        message: 'participate draw success',
      };
    } else if (drawRes === 0) {
      return {
        code: 2,
        message: 'already participated',
      };
    } else {
      throw new InternalServerErrorException('redis sadd failed');
    }
  }

  async get_lucky_set(product_id: string, count: number) {
    const lucky_member = await this.redis.srandmember(
      `seckill:drawset:${product_id}`,
      count,
    );
    if (lucky_member.length === 0) {
      // 无人参加
      return -1;
    }
    const saddRes = await this.redis.sadd(
      `seckill:luckyset:${product_id}`,
      lucky_member as number[],
    );
    return saddRes; // 1
  }

  async destory(product_id: string) {
    //! this will remove product, product-items that related to product and related order...
    const removeRes = await this.productsService.remove(product_id);
    const clearRes = await this.clearSeckillCache(product_id);
    return {
      removeRes,
      clearRes,
    };
  }

  /**
   * 根据product id清空秒杀缓存
   * 包括 ：
   * seckill:stock:<product_id>
   * seckill:sale_timestamp:<product_id>
   * seckill:drawset:<product_id>
   * seckill:luckyset:<product_id>
   * drawend timeout
   * @param product_id
   */
  async clearSeckillCache(product_id: string) {
    const deleteRes = await this.redis.del(
      `seckill:stock:${product_id}`,
      `seckill:sale_timestamp:${product_id}`,
      `seckill:drawset:${product_id}`,
      `seckill:luckyset:${product_id}`,
      `seckill:buyset:${product_id}`,
    );
    return deleteRes >= 4;
  }

  /**
   * 秒杀接口
   * !前置条件: product nft_class_id && collector.bsn_address必须均不为空，秒杀代码尽量不做mysql查询，前端必须调用前必须做验证！
   * @param collector_id 买家id
   * @param product_id 藏品id
   * @returns 抢购结果
   */
  async seckill(collector_id: number, product_id: string) {
    // lua脚本
    // 资格检查 collector_id in luckyset?
    // 库存检查 decrby/decr 看decr之后数值是否大于等于0，小于0无效
    // 返回减库存之后的值作为用户能购买的no

    const [collector, product] = await Promise.all([
      this.collectorService.findOne(collector_id) as Promise<Collector>,
      this.productsService.findOne(product_id) as Promise<Product>,
    ]);
    if (!product.nft_class_id) {
      throw new InternalServerErrorException('product nft_class_id is empty');
    }
    if (!collector.bsn_address) {
      return {
        code: 5,
        message: 'collector must have bsn account',
      };
    }
    if (
      this.dayjsService.dayjsify() <
      this.dayjsService.dayjsify(
        this.redis.get(`seckill:sale_timestamp:${product_id}`),
      )
    ) {
      return {
        code: 4,
        message: 'not time yet.',
      };
    }

    // lua高并发原子化控制
    const seckillRes = await this.redis.seckill(
      `seckill:luckyset:${product_id}`,
      `seckill:stock:${product_id}`,
      `seckill:buyset:${product_id}`,
      collector_id,
    );
    if (seckillRes == -2) {
      return {
        code: 2,
        message: 'no permission',
      };
    } else if (seckillRes == -1) {
      return {
        code: 1,
        message: 'no stock',
      };
    } else if (seckillRes == -3) {
      return {
        code: 3,
        message: 'bought',
      };
    } else if (seckillRes >= 0) {
      // 已抢到
      // 添加订单到数据库
      const product_item =
        await this.productItemsService.findOneByProductIdAndNo(
          product_id,
          seckillRes,
          true,
        );
      const order = await this.ordersService.create({
        product_item_id: product_item.id,
        buyer_id: collector_id,
        sum_price: product_item.product.price,
      });

      // 10分钟后自动标记为canceled
      this.schedulerRegistry.addTimeout(
        `seckill:cancel:${order.id}`,
        setTimeout(async () => {
          // do something to cancel order
          await this.payment_cancel(order.id);
          // remove this timeout
          try {
            this.schedulerRegistry.deleteTimeout(`seckill:cancel:${order.id}`);
          } catch (err) {
            this.logger.warn(
              `seckill:cancel:${order.id} timeout not found: ${err}`,
            );
          }
        }, 10 * 60 * 1000),
      );
      return {
        code: 0,
        message: 'seckill success',
        order_id: order.id, // 返回order_id
      };
    } else {
      throw new InternalServerErrorException(
        'unknown redis seckill error' + seckillRes,
      );
    }
  }

  // todo: 支付接口调用
  async pay(order_id: string) {
    //
    throw new NotImplementedException(order_id);
  }

  // todo: 支付完成回调: 1. 删除timeout 2. 设置订单为已支付，设置支付时间 3. 藏品上链
  // ?前端限制用户实际timeout时间应该少 10 秒，防止边界情况同时处理支付完成和支付超时
  // 1. 设置订单数据，用户积分更新
  // 2. 队列任务：用户在链上铸造一个nft，ownera为用户自己的地址，铸造完成后绑定nft_id即可完成确权
  // ? (用户花的能量是应用方的能力对吧？)
  // 3. 返回订单数据
  async payment_complete(order_id: string) {
    //* 查表获取所需数据
    const order = (await this.ordersService.findOne(order_id, true)) as Order;
    const product_item = (await this.productItemsService.findOne(
      order.product_item_id,
      true,
    )) as ProductItem;
    //* 验证数据有效性
    if (!product_item.product.nft_class_id || !order.buyer.bsn_address) {
      throw new BadRequestException(
        'product.nft_class_id & buyer.bsn_address should not be null',
      );
    }
    //* 验证order还未超时
    if (order.payment_status === PaymentStatus.CANCELED) {
      throw new BadRequestException('order is canceled');
    } else if (order.payment_status === PaymentStatus.PAID) {
      throw new BadRequestException('order is paid');
    }
    //* 删除timeout
    try {
      this.schedulerRegistry.deleteTimeout(`seckill:cancel:${order_id}`);
    } catch (err) {
      this.logger.warn('no timeout found:' + err);
    }
    //* 更新数据表 order paid & product_item owner_id
    const [orderUpdateRes, ownerUpdateRes] = await Promise.all([
      // 更新订单支付情况
      this.ordersService.paid(
        order_id,
        this.dayjsService.date(),
      ) as Promise<Order>,
      // owner更新
      this.productItemsService.update(product_item.id, {
        owner_id: order.buyer.id,
      }) as Promise<ProductItem>,
      // 积分更新
      this.collectorService.update(order.buyer.id, {
        credit: (Number(order.sum_price) * 0.01).toString(),
      }),
    ]);
    //* 藏品上链
    const createNftRes = await this.bsnService.create_nft({
      class_id: product_item.product.nft_class_id,
      name: `${product_item.product.name}#${product_item.no
        .toString()
        .padStart(4, '0')}#晋元数藏@${order.buyer.username}(${order.buyer.id})`,
      uri: product_item.product.src,
      recipient: order.buyer.bsn_address,
      data: product_item.id, // 将product_item_id作为data存储，后续查询用户名下藏品的流程是: 查链上用户名下藏品，查到data字段
    });
    //* 队列内持续拉取最新事务情况
    this.affairQueue.add(
      'update-product-item-nft-id',
      {
        product_item_id: product_item.id,
        operation_id: createNftRes.operation_id,
      },
      {
        attempts: 10,
        delay: 3000,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        timeout: 30000,
      },
    );
    return {
      orderUpdateRes,
      createNftRes,
      ownerUpdateRes,
    };
  }

  /**
   * * 超时未支付/取消支付：1. 归还库存 2. buyset删除用户 3. 取消订单 4. 取消timeout
   * @param order_id 订单号
   */
  async payment_cancel(order_id: string) {
    // 归还库存
    // buyeset删除该用户
    // 取消订单
    // 取消timeout
    const order = (await this.ordersService
      .findOne(order_id, true)
      .catch((err) => {
        this.logger.error('order not fount: ' + err);
        return null;
      })) as Order | null;
    if (!order) {
      throw new BadRequestException('order not found');
    }
    if (order.payment_status !== PaymentStatus.UNPAID) {
      throw new BadRequestException('order is paid or canceled');
    }
    const timeoutRes = await Promise.all([
      this.redis.incr(`seckill:stock:${order.product_item.product_id}`),
      this.redis.srem(
        `seckill:buyset:${order.product_item.product_id}`,
        order.buyer_id,
      ),
      this.ordersService.cancel(order_id).catch((err) => {
        this.logger.error(err);
        return -1;
      }),
    ]);
    try {
      this.schedulerRegistry.deleteTimeout(`seckill:cancel:${order_id}`);
    } catch (err) {
      this.logger.warn('no timeout found:' + err);
    }
    return {
      returnStock: timeoutRes[0],
      removeBuyerRes: timeoutRes[1],
      cancelOrderRes: timeoutRes[2],
    };
  }
}
