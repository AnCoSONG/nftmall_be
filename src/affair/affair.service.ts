import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Inject,
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
import { WXPAY_SYMBOL } from '../lib/wxpay.provider';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductItem } from '../product-items/entities/product-item.entity';
import { ProductItemsService } from '../product-items/product-items.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { PublishersService } from '../publishers/publishers.service';
import WXPAY from 'wechatpay-node-v3';
import { WxCallbackDto } from './common.dto';
import { ConfigService } from '@nestjs/config';
import { boolean } from 'joi';

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
    @Inject(WXPAY_SYMBOL) private readonly wxpay: WXPAY,
    private readonly configService: ConfigService,
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
    //* 上链
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

    //* 生成链上nft class id并异步写入product，为之后product创建product item上链做准备（因为上链发行nft必须要nft class)
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
    // * seckill:items:<product_id> 记录藏品序号
    // * seckill:sale_timestamp:<product_id> 记录开售时间
    // * seckill:drawset:<product_id> 记录抽签集合
    // * seckill:luckyset:<product_id> 通过srandmember得到
    await Promise.all([
      this.redis.set(
        `seckill:stock:${createProductRes.id}`,
        createProductRes.publish_count,
      ),
      this.redis.sadd(
        `seckill:items:${createProductRes.id}`,
        new Array(createProductRes.publish_count)
          .fill(0)
          .map((item, index) => index + 1),
      ),
      this.redis.set(
        `seckill:sale_timestamp:${createProductRes.id}`,
        createProductRes.sale_timestamp.valueOf(),
      ),
      //* 初始化抽签表
      this.redis.sadd(`seckill:drawset:${createProductRes.id}`, -1),
      //* 初始化中签表
      this.redis.sadd(`seckill:luckyset:${createProductRes.id}`, -1),
    ]);

    // 抽签结束回调，生成lucky set供购买时检查
    this.schedulerRegistry.addTimeout(
      `seckill:drawend:${createProductRes.id}`,
      setTimeout(async () => {
        // console.log(createProductRes.id, createProductRes.publish_count);
        await this.genLuckySet(
          createProductRes.id,
          createProductRes.publish_count * 2, // todo: 抽到的要比实际发售的多，这里设置为2倍
        );
        try {
          this.schedulerRegistry.deleteTimeout(
            `seckill:drawend:${createProductRes.id}`,
          );
        } catch (e) {
          this.logger.warn(
            `seckill:drawend:${createProductRes.id} not found: ${e}`,
          );
        }
      }, this.dayjsService.dayjsify(createProductRes.draw_end_timestamp).valueOf() - this.dayjsService.dayjsify().valueOf()),
    );

    //* 生成假数据
    //! 后期去掉！
    // this.schedulerRegistry.addTimeout(
    //   `seckill:draw:${createProductRes.id}`,
    //   setTimeout(async () => {
    //     await Promise.all([
    //       this.participate_draw(1, createProductRes.id),
    //       this.participate_draw(2, createProductRes.id),
    //       this.participate_draw(3, createProductRes.id),
    //     ]);
    //     this.logger.log('Fake data generated');
    //     try {
    //       this.schedulerRegistry.deleteTimeout(
    //         `seckill:draw:${createProductRes.id}`,
    //       );
    //     } catch (e) {
    //       this.logger.error(
    //         `seckill:draw:${createProductRes.id} not found: ${e}`,
    //       );
    //     }
    //   }, this.dayjsService.dayjsify(createProductRes.draw_timestamp) - this.dayjsService.dayjsify()),
    // );

    return {
      operation_id: createNftClassRes.operation_id,
      createProductRes,
    };
  }

  /**
   * !手动刷新 nft
   * !前提是之前的上链任务失败了
   * @param product_id
   * @param operation_id
   * @param retry
   * @returns
   */
  async manual_update_nft_id(
    product_id: string,
    operation_id: string,
    retry = 10,
  ) {
    this.affairQueue.add(
      'update-nft-class-id',
      {
        product_id: product_id,
        operation_id: operation_id,
      },
      {
        delay: 3000,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        attempts: retry,
        timeout: 30000,
        // removeOnComplete: true,
      },
    );
    return {
      message: 'update-nft-class-id-affair-queued',
    };
  }

  // queue:status:<job_name>:<product_id>
  async get_status(redis_task_key: string) {
    return await this.redis.get(redis_task_key);
  }

  async get_stock_count(product_id: string, db: string) {
    if (db === 'redis') {
      return {
        stock_count: parseInt(
          await this.redis.get(`seckill:stock:${product_id}`),
        ),
      };
    } else {
      return await this.productsService.get_stock_count(product_id);
    }
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
    // todo: 参与抽签时间
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

  async genLuckySet(product_id: string, count: number) {
    const lucky_member = await this.redis.srandmember(
      `seckill:drawset:${product_id}`,
      count,
    );
    if (lucky_member.length === 1) {
      // 无人参加
      this.logger.warn('No real user participate in draw...');
      return;
    }
    const saddRes = await this.redis.sadd(
      `seckill:luckyset:${product_id}`,
      lucky_member as number[],
    );
    if (saddRes >= 1) {
      this.logger.log(
        `seckill:luckyset:${product_id} generated! Count: ${lucky_member.length}`,
      );
    } else {
      this.logger.error(
        `seckill:luckyset:${product_id} generates failed! Redis response: ${saddRes}`,
      );
    }
    return;
  }

  async destory(product_id: string) {
    // todo: delete nft
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
   * @param product_id
   */
  async clearSeckillCache(product_id: string) {
    const deleteRes = await this.redis.del(
      `seckill:stock:${product_id}`,
      `seckill:items:${product_id}`,
      `seckill:sale_timestamp:${product_id}`,
      `seckill:drawset:${product_id}`,
      `seckill:luckyset:${product_id}`,
      `seckill:buyhash:${product_id}`,
    );
    return deleteRes;
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
        message: '购买者必须拥有区块链钱包账户',
      };
    }
    if (
      !(collector.real_name && collector.real_id) &&
      !collector['is_verified']
    ) {
      return {
        code: 6,
        message: '购买者必须完成实名认证',
      };
    }
    if (
      this.dayjsService.dayjsify() <
      this.dayjsService.dayjsify(
        await this.redis.get(`seckill:sale_timestamp:${product_id}`),
      )
    ) {
      return {
        code: 4,
        message: '还未到时间',
      };
    }

    // lua高并发原子化控制
    // todo: buyhash增加是否应该放在支付完成后
    // todo: 秒杀脚本优化，增加一个藏品set，记录no：stock=3 => stock = 3 & set(0,1,2); get_stock_count: get stock; return_stock: stock++ & sadd set return_no; buy: stock -- & spop set, return pop value;
    const seckillRes = await this.redis.seckill(
      `seckill:luckyset:${product_id}`,
      `seckill:stock:${product_id}`,
      `seckill:buyhash:${product_id}`,
      `seckill:items:${product_id}`,
      collector_id,
      product.limit,
    );
    if (seckillRes == -2) {
      return {
        code: 2,
        message: '该藏品您无权限购买',
      };
    } else if (seckillRes == -1) {
      return {
        code: 1,
        message: '藏品已售罄',
      };
    } else if (seckillRes == -3) {
      return {
        code: 3,
        message: '已达购买上限',
      };
    } else if (seckillRes > 0) {
      // [1, count]
      // 已抢到
      // 找到对应的记录
      // todo: 创建对应的记录 ？可行性分析 & 实现
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
          // do something to cancel order & remove related timeout
          await this.payment_cancel(order.id);
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

  // todo: 支付接口测试
  async pay(order_id: string, ip: string) {
    // todo: 改进参数，根据前端实际情况传递需要的参数
    const order = (await this.ordersService.findOne(order_id, true)) as Order;
    if (order.payment_status === PaymentStatus.PAID) {
      throw new BadRequestException('order is already paid');
    } else if (order.payment_status === PaymentStatus.CANCELED) {
      throw new BadRequestException('order is canceled');
    }
    const payRes = await this.wxpay.transactions_h5({
      description: '测试',
      out_trade_no: order.trade_no,
      notify_url: 'https://api.jinyuanshuzi.com/v1/affair/paymentCallback',
      attach: order.id,
      amount: {
        total: parseFloat(order.sum_price) * 100,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: ip,
        h5_info: {
          type: 'Wap',
          app_name: '晋元数藏商城',
          app_url: 'jinyuanshucang.com',
        },
      },
    });
    if (payRes.status !== 200) {
      return {
        payRes: payRes,
      };
    } else {
      throw new InternalServerErrorException(payRes.message);
    }
  }

  // todo 根据实际情况调整回调处理方案
  //* payment_complete / payment_cancel
  async payment_callback(body: WxCallbackDto) {
    console.log('收到微信callback', body);
    try {
      const result = this.wxpay.decipher_gcm(
        body.resource.ciphertext,
        body.resource.associated_data,
        body.resource.nonce,
        this.configService.get('wxpay.apiv3'),
      ) as Record<string, any>;
      const payment_status = await this.ordersService.get_order_payment_status(
        result.attach,
      );
      if (payment_status !== PaymentStatus.PAID) {
        return { code: 1, message: 'order is already paid', error: '' };
      }
      if (result.trade_state === 'SUCCESS') {
        return { code: 0, message: 'success', error: '' };
      } else if (result.trade_state === 'NOTPAY') {
        //* 未支付时应当设置为unpaid
        await this.ordersService.update(result.attach, {
          payment_status: PaymentStatus.UNPAID,
        });
        return { code: 2, message: 'not pay', error: '' };
      }
      // console.log(result);
      return { code: 0, result: result, error: '' }; // 给controller进一步解析
    } catch (err) {
      console.log(err.code);
      return { code: 100, error: `${err.code}: ${err.message}`, result: '' };
    }
  }

  // todo: 根据实际情况调整，去掉一些不需要加载的内容
  // !支付成功: 1. 删除timeout 2. 设置订单为已支付，设置支付时间 3. 藏品上链
  // ?前端限制用户实际timeout时间应该少 10 秒，防止边界情况同时处理支付完成和支付超时
  // 1. 设置订单数据，用户积分更新
  // 2. 队列任务：用户在链上铸造一个nft，ownera为用户自己的地址，铸造完成后绑定nft_id即可完成确权
  // ? (用户花的能量是应用方的能力对吧？)
  // 3. 返回订单数据
  async payment_complete(order_id: string, out_trade_id: string) {
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
        out_trade_id,
        parseFloat(order.sum_price) * 100,
      ) as Promise<Order>,
      // owner更新
      this.productItemsService.update(product_item.id, {
        owner_id: order.buyer.id,
      }) as Promise<ProductItem>,
      // 增加积分
      this.collectorService.addCredit(
        order.buyer.id,
        parseFloat(order.sum_price) * 100,
      ),
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
        nft_class_id: product_item.product.nft_class_id,
        operation_id: createNftRes.operation_id,
      },
      {
        attempts: 10,
        delay: 3000,
        backoff: {
          type: 'exponential',
          delay: 4000,
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
   * todo: 根据实际情况调整
   * * 超时未支付/取消支付：1. 归还库存 2. buyhash减购买量 3. 取消订单 4. 取消timeout
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
    const [returnStockRes, cancelOrderRes] = await Promise.all([
      this.redis.returnStock(
        `seckill:stock:${order.product_item.product_id}`,
        `seckill:buyhash:${order.product_item.product_id}`,
        `seckill:items:${order.product_item.product_id}`,
        order.buyer_id.toString(),
        order.product_item.no,
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
      returnStockRes,
      cancelOrderRes
    };
  }

  async fetch_payment_result(trade_no: string) {
    const res = await this.wxpay.query({ out_trade_no: trade_no });
    // todo: 根据订单返回结果设置order状态
  }
}
