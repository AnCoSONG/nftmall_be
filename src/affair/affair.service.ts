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
import {
  CallbackData,
  onChainStatus,
  PaymentStatus,
  ProductAttribute,
  productItemSource,
  productItemStatus,
  transferLaunchType,
} from '../common/const';
import { redisExceptionCatcher, sqlExceptionCatcher } from '../common/utils';
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
import { Publisher } from '../publishers/entities/publisher.entity';
import { ProductItemTransferService } from '../product-item-transfer/product-item-transfer.service';

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
    private readonly productItemTransferService: ProductItemTransferService,
    @InjectRedis() private readonly redis: Redis,
    @Inject(WXPAY_SYMBOL) private readonly wxpay: WXPAY,
    private readonly configService: ConfigService,
  ) {
    // todo 初始化scheduler 载入待完成的
  }

  /**
   * 内部方法：完成redist设置
   * @param product_id 藏品系列ID
   * @param publish_count 发行量
   * @param published_count 已发行量，如果没有则填0，否则应该填至今为止全部的发行量
   */
  async __publish_setup_redis(
    product_id: string,
    publish_count: number,
    published_count = 0,
  ) {
    // * 创建redis抢购所需数据类型
    // * seckill:stock:<product_id> 记录库存
    // * seckill:items:<product_id> 记录藏品序号
    // * 抽签&抽签后生成
    // * seckill:drawset:<product_id> 记录抽签集合
    // * seckill:luckyset:<product_id> 通过srandmember得到
    const redisSetupRes = await Promise.all([
      this.redis.set(`seckill:stock:${product_id}`, publish_count),
      this.redis.sadd(
        `seckill:items:${product_id}`,
        new Array(publish_count)
          .fill(0)
          .map((item, index) => index + 1 + published_count),
      ),
    ]);
    return redisSetupRes;
  }

  async __publish_setup_draw_end_timeout(
    product_id: string,
    draw_count: number,
    draw_end_timestamp: string | Date,
  ) {
    // todo: 服务重启后也应能正确完成
    this.logger.log(
      `gen lucky set job queued! ${product_id} ${draw_count} ${draw_end_timestamp}`,
    );
    const job = await this.affairQueue.add(
      'gen-lucky-set',
      {
        product_id,
        draw_count,
      },
      {
        attempts: 3,
        delay:
          this.dayjsService.dayjsify(draw_end_timestamp).valueOf() -
          this.dayjsService.dayjsify().valueOf(),
      },
    );
    // 设置redis key，删除藏品时主动删除该key
    await this.redis.set(`gen_lucky_set:${product_id}`, job.id);
  }

  /**
   * ! 发布藏品
   *
   * @param publisher_id 创作者
   * @param createProductDto
   * @returns
   */
  async publish(publisher_id: string, createProductDto: CreateProductDto) {
    //* 检查是否存在该id
    const publisher = await sqlExceptionCatcher(
      this.publisherService.findOne(publisher_id),
    );
    //* 创建一个product
    createProductDto.publisher_id = publisher.id;
    if (createProductDto.attribute === ProductAttribute.gift) {
      // 赠品初始化为1亿份，保证绝对够用
      // todo 是否更改为根据publish_count定制
      createProductDto.publish_count = 100000000;
      createProductDto.stock_count = 100000000;
      createProductDto.limit = 0;
    }
    const createProductRes = await this.productsService.create(
      createProductDto,
    );
    //* 上链
    const create_nft_class_id_operation_id =
      await this._create_nft_class_id_for_product(createProductRes, publisher);

    //* 创建product items
    //! Breaking change: 新发行藏品购买后才会创建Items
    // this.affairQueue.add(
    //   'create-product-items',
    //   {
    //     product_id: createProductRes.id,
    //     count: createProductRes.publish_count,
    //   },
    //   {
    //     delay: 3000,
    //   },
    // );
    if (createProductRes.attribute === ProductAttribute.normal) {
      // * 可购买的
      // * 设置redis
      await this.__publish_setup_redis(
        createProductRes.id,
        createProductRes.publish_count,
      );

      // * 抽签结束时生成lucky set
      this.__publish_setup_draw_end_timeout(
        createProductRes.id,
        createProductRes.publish_count * 2,
        createProductRes.draw_end_timestamp,
      );

      return {
        operation_id: create_nft_class_id_operation_id,
        id: createProductRes.id,
      };
    } else if (createProductRes.attribute === ProductAttribute.gift) {
      // * 赠品 redis设置库存，用于原子增减
      await this.redis.set(
        `gift:stock:${createProductRes.id}`,
        createProductRes.publish_count,
      );
      return {
        id: createProductRes.id,
      };
    } else {
      throw new BadRequestException('不支持的藏品属性');
    }
  }

  /**
   * 增量发布，继承 product_id 的 全部属性
   * 必须提供 发行数量，已发行量, 抽签时间，购买时间，抽签结束时间
   * @param product_id
   */
  async incremental_publish(
    product_id: string,
    count: number,
    published_count: number,
    draw_timestamp: string,
    draw_end_timestamp: string,
    sale_timestamp: string,
  ) {
    const product = await this.productsService.findOneWithGenres(product_id);
    if (product.attribute === ProductAttribute.gift) {
      throw new BadRequestException('赠品无法增量发布');
    }
    delete product.id;
    delete product.create_date;
    delete product.update_date;
    delete product.delete_date;
    delete product.version;
    product.publish_count = count;
    product.stock_count = count;
    product.draw_timestamp = new Date(draw_timestamp);
    product.draw_end_timestamp = new Date(draw_end_timestamp);
    product.sale_timestamp = new Date(sale_timestamp);
    product.is_soldout = false; // 防止直接显示已售罄
    // * 创建新藏品
    const increamentalCreateRes = await this.productsService.create(product);
    // * 设置redis
    await this.__publish_setup_redis(
      increamentalCreateRes.id,
      increamentalCreateRes.publish_count,
      published_count,
    );
    // * 初始化抽签器
    this.__publish_setup_draw_end_timeout(
      increamentalCreateRes.id,
      count * 2,
      draw_end_timestamp,
    ); // fix 增量发布抽签数量也为2倍

    return {
      id: increamentalCreateRes.id,
    };
  }

  /**
   * 定向赠送
   */
  async send_product_item_to_collector(
    product_id: string,
    collector_id: number,
  ) {
    // 获取数据
    const [product, collector, stock_count] = await Promise.all([
      this.productsService.findOne(product_id),
      this.collectorService.findOne(collector_id),
      this.redis.get(`gift:stock:${product_id}`),
    ]);
    if (product.attribute === ProductAttribute.normal) {
      throw new BadRequestException('常规藏品不支持赠送');
    }
    // 计算no
    const no = product.publish_count - Number(stock_count) + 1; // 从 1 开始
    // 创建藏品
    const product_item = await this.productItemsService.create({
      product_id: product_id,
      no: no,
      owner_id: collector_id,
      source: productItemSource.PLATFORM_GIFT
    });
    // 上链
    const operation_id = await this._create_nft_for_product_item(
      product_item,
      collector,
    );
    // 更新库存
    await this.redis.decr(`gift:stock:${product_id}`); // 原子 - 1
    return {
      operation_id,
    };
  }

  async create_nft_class_id_for_product(product_id: string) {
    const product = (await this.productsService.findOne(
      product_id,
      true,
    )) as Product;
    if (product.on_chain_status === onChainStatus.SUCCESS) {
      return {
        code: 1,
        message: '已经创建好',
      };
    } else if (product.on_chain_status === onChainStatus.PROCESSING) {
      return {
        code: 2,
        message: '请等待当前创建结果返回',
      };
    }
    const operation_id = await this._create_nft_class_id_for_product(
      product,
      product.publisher,
    );
    return {
      code: 0,
      message: '已发起创建NFT Class ID请求, 请等待异步刷新',
      operation_id,
    };
  }

  /**
   * * 内部方法：手动创建nft class id
   */
  async _create_nft_class_id_for_product(
    product: Product,
    publisher: Publisher,
  ) {
    const createNftClassRes = await this.bsnService.create_nft_class({
      owner: publisher.bsn_address,
      name: `${product.name}@晋元数字`,
      uri: product.chain_src, // add chain src to nft class
    });
    if (createNftClassRes.code) {
      throw new BadRequestException(
        'BsnService.create_nft_class failed: ' + createNftClassRes.message,
      );
    }
    this.logger.log(
      'create-nft-class-operation-id: ' + createNftClassRes.operation_id,
    );

    //* 生成链上nft class id并异步写入product，为之后product创建product item上链做准备（因为上链发行nft必须要nft class)
    this.affairQueue.add(
      'update-nft-class-id',
      {
        product_id: product.id,
        operation_id: createNftClassRes.operation_id,
      },
      {
        delay: 3000,
        backoff: {
          // 3, 6, 12, 24, 48, 96, 192 ...
          type: 'exponential',
          delay: 3000,
        },
        attempts: 15, // 最长等待27小时
        timeout: 30000,
        // removeOnComplete: true,
      },
    );
    return createNftClassRes.operation_id;
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
   * @Deperacted
   * @param product_id
   * @param add_count
   * @returns
   */
  async add_stock(product_id: string, add_count: number) {
    const product = (await this.productsService.findOne(product_id)) as Product;
    // redis更新
    const redisUpdateRes = await Promise.all([
      this.redis.incrby(`seckill:stock:${product_id}`, add_count),
      this.redis.sadd(
        `seckill:items:${product_id}`,
        new Array(add_count)
          .fill(product.publish_count)
          .map((item, index) => item + index + 1),
      ),
    ]);
    const dbUpdateRes = (await this.productsService.update(product_id, {
      publish_count: product.publish_count + add_count,
      stock_count: product.stock_count + add_count,
    })) as Product;
    return {
      redis_stock_count: redisUpdateRes[0],
      redis_items_add_res: redisUpdateRes[1],
      db_publish_count: dbUpdateRes.publish_count,
      db_stock_count: dbUpdateRes.stock_count,
    };
  }

  async sync_stock(product_id: string) {
    const product = await this.productsService.findOne(product_id, false);
    let redis_key: string;
    if (product.attribute === 'gift') {
      redis_key = `gift:stock:${product_id}`;
    } else if (product.attribute === 'normal') {
      redis_key = `seckill:stock:${product_id}`;
    } else {
      throw new InternalServerErrorException(
        '未知product attribute: ' + product.attribute,
      );
    }
    const redis_stock_count = await this.redis.get(redis_key);
    const result = (await this.productsService.update(product_id, {
      stock_count: parseInt(redis_stock_count),
    })) as Product;
    return result.stock_count === parseInt(redis_stock_count);
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
    this.logger.debug(`ID: ${collector_id} 参与抽签 ${product_id}`);
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
      this.logger.debug(`ID: ${collector_id} 抽签成功`);
      return {
        code: 0,
        message: 'participate draw success',
      };
    } else if (drawRes === 0) {
      this.logger.debug(`ID: ${collector_id} 已参与`);

      return {
        code: 2,
        message: 'already participated',
      };
    } else {
      throw new InternalServerErrorException('redis sadd failed');
    }
  }

  async genLuckySet(product_id: string, count: number) {
    const exist = await this.redis.exists(`seckill:luckyset:${product_id}`);
    if (exist === 1) {
      return {
        code: 1,
        message: '已存在',
      };
    }
    const lucky_member = await this.redis.srandmember(
      `seckill:drawset:${product_id}`,
      count,
    );
    if (lucky_member.length === 0) {
      // 无人参加
      this.logger.warn(
        `Draw for ${product_id}: No real user participate in draw...`,
      );
      return {
        code: 2,
        message: '无人参加',
      };
    }
    const saddRes = await redisExceptionCatcher(
      this.redis.sadd(
        `seckill:luckyset:${product_id}`,
        lucky_member as number[],
      ),
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
    return {
      code: 0,
      message: '已生成',
    };
  }

  async destory(product_id: string) {
    // todo: delete nft
    //! this will remove product, product-items that related to product and related order...
    // 删除藏品
    const removeRes = await this.productsService.remove(product_id);
    // 清除藏品抽签job
    const job_id = await this.redis.get(`gen_lucky_set:${product_id}`);
    if (job_id) {
      const job = await this.affairQueue.getJob(job_id);
      if (job) {
        await job.remove();
      }
    }
    // 清空redis缓存
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
      `seckill:drawset:${product_id}`,
      `seckill:luckyset:${product_id}`,
      `seckill:buyhash:${product_id}`,
      `gift:stock:${product_id}`,
      `gen_lucky_set:${product_id}`,
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
    const product = (await this.productsService.findOne(
      product_id,
      false,
    )) as Product;
    if (!product.nft_class_id) {
      throw new InternalServerErrorException('藏品未上链，请联系工作人员');
    }
    if (
      this.dayjsService.dayjsify() <
      this.dayjsService.dayjsify(product.sale_timestamp)
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
      // * 提前创建好秒杀
      // const product_item =
      //   await this.productItemsService.findOneByProductIdAndNo(
      //     product_id,
      //     seckillRes,
      //     true,
      //   );
      // * 秒杀时临时创建
      const product_item = await this.productItemsService.create({
        product_id: product_id,
        no: seckillRes,
        source: productItemSource.BUY
      });
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

  async seckill_test(collector_id: number, product_id: string) {
    // lua脚本
    // 资格检查 collector_id in luckyset?
    // 库存检查 decrby/decr 看decr之后数值是否大于等于0，小于0无效
    // 返回减库存之后的值作为用户能购买的no

    const product = (await this.productsService.findOne(
      product_id,
      false,
    )) as Product;
    if (!product.nft_class_id) {
      throw new InternalServerErrorException('藏品未上链，请联系工作人员');
    }
    if (
      this.dayjsService.dayjsify() <
      this.dayjsService.dayjsify(product.sale_timestamp)
    ) {
      return {
        code: 4,
        message: '还未到时间',
      };
    }
    // const [collector, product] = await Promise.all([
    //   this.collectorService.findOne(collector_id) as Promise<Collector>,
    //   this.productsService.findOne(product_id) as Promise<Product>,
    // ]);
    // if (!product.nft_class_id) {
    //   throw new InternalServerErrorException('product nft_class_id is empty');
    // }
    // if (!collector.bsn_address) {
    //   return {
    //     code: 5,
    //     message: '购买者必须拥有区块链钱包账户',
    //   };
    // }
    // if (
    //   !(collector.real_name && collector.real_id) &&
    //   !collector['is_verified']
    // ) {
    //   return {
    //     code: 6,
    //     message: '购买者必须完成实名认证',
    //   };
    // }
    // if (
    //   this.dayjsService.dayjsify() <
    //   this.dayjsService.dayjsify(product.sale_timestamp)
    // ) {
    //   return {
    //     code: 4,
    //     message: '还未到时间',
    //   };
    // }

    // lua高并发原子化控制
    // todo: buyhash增加是否应该放在支付完成后
    // todo: 秒杀脚本优化，增加一个藏品set，记录no：stock=3 => stock = 3 & set(0,1,2); get_stock_count: get stock; return_stock: stock++ & sadd set return_no; buy: stock -- & spop set, return pop value;
    const seckillRes = await this.redis.seckill(
      `seckill:luckyset:${product_id}`,
      `seckill:stock:${product_id}`,
      `seckill:buyhash:${product_id}`,
      `seckill:items:${product_id}`,
      collector_id,
      product.stock_count,
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
      return {
        code: 0,
        message: 'seckill success',
      };
    } else {
      throw new InternalServerErrorException(
        'unknown redis seckill error' + seckillRes,
      );
    }
  }

  // todo: 支付接口测试
  async pay(
    order_id: string,
    ip: string,
    type: 'jsapi' | 'h5',
    openid?: string,
  ) {
    // todo: 改进参数，根据前端实际情况传递需要的参数
    const order = (await this.ordersService.findOne(order_id, true)) as Order;
    if (order.payment_status === PaymentStatus.PAID) {
      throw new BadRequestException('订单已完成支付');
    } else if (order.payment_status === PaymentStatus.CANCELED) {
      throw new BadRequestException('订单已取消');
    }
    // 如果找不到就会自动throw
    await this.productsService.findOne(order.product_item.product_id, false);
    let payRes;
    if (type === 'h5') {
      payRes = await this.wxpay.transactions_h5({
        description: order.product_item.product.description, // description用于商品描述
        out_trade_no: order.trade_no, // 内部订单号，满足要求 [6,32]
        notify_url: 'https://api.jinyuanshuzi.com/v1/affair/paymentCallback', // 通知地址
        attach: order.id, // 附加数据存放order.id
        time_expire: this.dayjsService.time_expire('m', 11),
        amount: {
          total: Math.round(parseFloat(order.sum_price) * 100), // fix: 金额问题
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
    } else if (type === 'jsapi') {
      if (!openid) {
        throw new BadRequestException('无OpenID');
      }
      // console.log(order_id, ip, type, openid);
      payRes = await this.wxpay
        .transactions_jsapi({
          description: order.product_item.product.description,
          out_trade_no: order.trade_no,
          notify_url: 'https://api.jinyuanshuzi.com/v1/affair/paymentCallback',
          time_expire: this.dayjsService.time_expire('m', 11),
          attach: order.id,
          amount: {
            total: Math.round(parseFloat(order.sum_price) * 100), // fix: 金额问题
            currency: 'CNY',
          },
          scene_info: {
            payer_client_ip: ip,
          },
          payer: {
            openid: openid,
          },
        })
        .catch((err) => {
          console.error(err);
          this.logger.error(err);
          return err;
        });
      // console.log(payRes);
    }
    if (payRes.status === 200) {
      return payRes;
    } else {
      throw new InternalServerErrorException(payRes);
    }
  }

  // todo 根据实际情况调整回调处理方案
  //* payment_complete / payment_cancel
  async payment_callback(body: WxCallbackDto) {
    try {
      const result = this.wxpay.decipher_gcm(
        body.resource.ciphertext,
        body.resource.associated_data,
        body.resource.nonce,
        this.configService.get('wxpay.apiv3'),
      ) as CallbackData;
      return await this._cope_with_payment(result);
    } catch (err) {
      this.logger.error(`[PAYMENT_CALLBACK_ERROR]: ${err}`);
      return { code: 100, message: err };
    }
  }

  async _cope_with_payment(result: CallbackData) {
    this.logger.log('回调结果: ' + JSON.stringify(result));
    const order = (await this.ordersService.findOne(
      result.attach,
      true,
      true, // 找不到不抛出
    )) as Order;
    if (!order) {
      return { code: -1 }; // 如果找不到(手动删掉)按已支付处理
    }
    if (order.payment_status === PaymentStatus.PAID) {
      this.logger.warn(`Order: ${order.id} 已支付！`);
      //? 如果用户已经支付，直接返回
      return { code: 1 }; // 已支付
    } else if (order.payment_status === PaymentStatus.CANCELED) {
      return { code: 3, message: '订单已被取消' }; //订单已取消
    }
    //! 如果没有支付收到了支付结果通知
    if (result.trade_state === 'SUCCESS') {
      // 完成支付
      const res = await this._payment_success(order, result.transaction_id);
      if (res.code === 10000) {
        return { code: 0 }; // 支付成功
      } else {
        return { code: res.code, message: res.message };
      }
    } else {
      // 支付失败或者其他原因
      this.logger.error(result);
      await this.ordersService.update(result.attach, {
        payment_status: PaymentStatus.UNPAID,
      });
      return { code: 2, message: result.trade_state }; // 莫名原因
    }
  }

  //* 供Callback内部使用的方法
  async _payment_success(order: Order, transaction_id: string) {
    /**
     * * 1.删除订单取消timeout
     * * 2.更新订单状态
     * * 3.藏品上链
     */
    const product_item = (await this.productItemsService.findOne(
      order.product_item_id,
      true,
    )) as ProductItem;
    if (!product_item.product.nft_class_id) {
      return { code: 10001, message: 'NFT类别还未上链' };
    }
    if (!order.buyer.bsn_address) {
      return { code: 10002, message: '用户无区块链钱包地址' };
    }
    //! 1. 删除订单取消的Timeout
    try {
      this.schedulerRegistry.deleteTimeout(`seckill:cancel:${order.id}`);
    } catch (err) {
      this.logger.warn('no timeout found:' + err);
    }
    //! 2. 更新订单状态
    const [orderUpdate, ownerUpdate, creditUpdate] = await Promise.all([
      // 更新订单支付情况
      this.ordersService
        .paid(
          order.id,
          this.dayjsService.date(),
          transaction_id,
          parseFloat(order.sum_price) * 100,
        )
        .catch((err) => {
          this.logger.error(`[ERROR when update order(${order.id})]: ${err}`);
          return null;
        }) as Promise<Order | null>,
      // owner更新
      this.productItemsService
        .update(product_item.id, {
          owner_id: order.buyer_id,
        })
        .catch((err) => {
          this.logger.error(
            `[ERROR when update product item(${product_item.id}) owner]: ${err}`,
          );
          return null;
        }) as Promise<ProductItem>,
      // 增加积分
      this.collectorService
        .addCredit(order.buyer_id, parseFloat(order.sum_price) * 100)
        .catch((err) => {
          this.logger.error(
            `[ERROR when update collector(${order.buyer_id})]: ${err}`,
          );
          return null;
        }),
    ]);
    if (!orderUpdate) {
      return { code: 10003, message: '订单支付更新失败' };
    }
    if (!ownerUpdate) {
      return { code: 10004, message: '藏品所有者更新失败' };
    }
    if (!creditUpdate) {
      return { code: 10005, message: '藏家积分更新失败' };
    }
    //! 3. 藏品上链
    await this._create_nft_for_product_item(product_item, order.buyer);
    return { code: 10000, message: '订单完成,待藏品上链' };
  }

  // !手动完成支付，当用户因为各种原因支付不成功时手动帮用户完成支付
  // * 支付成功: 1. 删除timeout 2. 设置订单为已支付，设置支付时间 3. 藏品上链
  // !前端限制用户实际timeout时间应该少 10 秒，防止边界情况同时处理支付完成和支付超时
  // 1. 设置订单数据，用户积分更新
  // 2. 队列任务：用户在链上铸造一个nft，owner为用户自己的地址，铸造完成后绑定nft_id即可完成确权
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
    const operation_id = await this._create_nft_for_product_item(
      product_item,
      order.buyer,
    );
    return {
      orderUpdateRes,
      operation_id,
      ownerUpdateRes,
    };
  }

  async _create_nft_for_product_item(
    product_item: ProductItem,
    buyer: Collector,
  ) {
    const createNftRes = await this.bsnService.create_nft({
      class_id: product_item.product.nft_class_id,
      name: `${product_item.product.name}#${product_item.no
        .toString()
        .padStart(4, '0')}@晋元数字#${buyer.id}`, // 不要用名字了，用户ID不会变 // fix 去掉括号
      uri: product_item.product.chain_src, // 链上存储chain_src
      recipient: buyer.bsn_address,
      data: product_item.id, // 将product_item_id作为data存储，后续查询用户名下藏品的流程是: 查链上用户名下藏品，查到data字段
    });
    if (createNftRes.code) {
      throw new InternalServerErrorException('bsnService create nft failed...');
    }
    this.affairQueue.add(
      'update-product-item-nft-id',
      {
        product_item_id: product_item.id,
        nft_class_id: product_item.product.nft_class_id,
        operation_id: createNftRes.operation_id,
      },
      {
        attempts: 15,
        delay: 3000,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        timeout: 30000,
      },
    );
    return createNftRes.operation_id;
  }

  async create_nft_for_product_item(order_id: string) {
    const order = (await this.ordersService.findOne(order_id, true)) as Order;
    const product_item = (await this.productItemsService.findOne(
      order.product_item_id,
      true,
    )) as ProductItem;
    const operation_id = await this._create_nft_for_product_item(
      product_item,
      order.buyer,
    );
    return operation_id;
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
        this.logger.error('order not found: ' + err);
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
      cancelOrderRes,
    };
  }

  async fetch_payment_result(trade_no: string) {
    let error;
    const result = (await this.wxpay
      .query({
        out_trade_no: trade_no,
      })
      .catch((err) => {
        error = `[ERROR when fetch payment result]: ${err}`;
        this.logger.error(error);
        return null;
      })) as CallbackData;
    if (result) {
      const res = await this._cope_with_payment(result);
      return res;
    } else {
      throw new InternalServerErrorException(error);
    }
  }

  async is_lucky_set_gen(product_id: string) {
    return await redisExceptionCatcher(
      this.redis.exists(`seckill:luckyset:${product_id}`),
    );
  }

  async get_draw_set_count(product_id: string) {
    return await redisExceptionCatcher(
      this.redis.scard(`seckill:drawset:${product_id}`),
    );
  }

  async transfer_nft(sender_id: number, receiver_id: number, product_item_id: string, launch_type: transferLaunchType) {
    const sender = await this.collectorService.findOne(sender_id, false)
    const receiver = await this.collectorService.findOne(receiver_id, false)
    const productItem = await this.productItemsService.findOne(product_item_id, false);
    if (!sender.bsn_address) {
      throw new BadRequestException(`sender ${sender.id} has no bsn address`)
    }
    if (!receiver.bsn_address) {
      throw new BadRequestException(`receiver ${receiver.id} has no bsn address`)
    }
    if (sender.bsn_address === receiver.bsn_address) {
      throw new BadRequestException(`sender and receiver are the same`)
    }
    if (!productItem.nft_class_id) {
      throw new BadRequestException(`product item id ${productItem.id} has no nft class id`)
    }
    if (!productItem.nft_id) {
      throw new BadRequestException(`product item id ${productItem.id} has no nft class id`)
    }
    if (productItem.owner_id !== sender.id) {
      throw new BadRequestException(`product item id ${productItem.id} is not owned by sender`)
    }
    if (productItem.status === productItemStatus.LOCKED || productItem.status === productItemStatus.TRANSFERED) {
      throw new BadRequestException(`product item id ${productItem.id} is locked or transfered`)
    }

    return await this.main_transfer_nft(
      sender,
      receiver,
      productItem,
      launch_type,
    )
  }

  async main_transfer_nft(sender: Collector, receiver: Collector, productItem: ProductItem, launch_type: transferLaunchType) {

    // todo: 转赠表增加一条记录 转赠人，被转赠人，转赠藏品id，转赠藏品品nft_id，藏品系列nft_class_id，藏品序号，操作id，转赠状态（待处理，已处理，已成功），转赠到达后新藏品id（数据库内），转赠交易哈希，转赠成功时间
    
    // 添加一条转赠记录
    const transfer_item = await this.productItemTransferService.create({
      sender_id: sender.id,
      receiver_id: receiver.id,
      nft_id: productItem.nft_id,
      nft_class_id: productItem.nft_class_id,
      original_product_item_id: productItem.id,
      launch_type: launch_type
    })

    this.logger.log('添加转赠表结果：' + JSON.stringify(transfer_item))

    // 将旧藏品锁定
    const lockRes = await this.productItemsService.update(productItem.id, {
      status: productItemStatus.LOCKED,
    })

    // 调用文昌链转赠接口
    const transfer_nft_res = await this.bsnService.transfer_nft(productItem.nft_class_id, sender.bsn_address, productItem.nft_id, receiver.bsn_address)
    this.logger.log('BSN转赠事务提交结果：' + JSON.stringify(transfer_nft_res))
    if (transfer_nft_res.code) {
      throw new InternalServerErrorException('bsnService transfeer nft failed...');
    }
    // 将轮询结果任务加入队列
    this.affairQueue.add('update-transfer-nft-status', {
      product_item_transfer_id: transfer_item.id,
      operation_id: transfer_nft_res.operation_id,
      old_product_item: productItem,
      receiver_id: receiver.id
    }, {
      delay: 3000,
      backoff: {
        // 3, 6, 12, 24, 48, 96, 192 ...
        type: 'exponential',
        delay: 3000,
      },
      attempts: 15, // 最长等待27小时
      timeout: 30000,
      // removeOnComplete: true,
    })
    return transfer_nft_res.operation_id;


    // todo: 加入队列进行轮询，成功后执行后续逻辑 done!
    // * 1. product_item 状态设置为已转赠（包括，默认，已锁定，已转赠）
    // todo: 为product_item增加状态字段、来源字段（购买、平台赠送、交易转赠）
    // * 2. 创建一个新的product item，保有同样的名称，class_id和no，链上相关数据来自转赠结果（操作id，钱包地址，nft_id，交易哈希=转赠哈希，上链时间=转赠成功时间，上链状态
    // todo: 修改productItem findOne系列，不返回已转赠状态的藏品
    // * 3. 转赠表更新状态，更新新藏品的数据库id，转赠哈希，转赠成功时间，
    // 
    // ? 1. 转赠人将无法查询到赠出的藏品（无法获取已转赠的藏品）
    // ? 2. 转赠人可以看到转赠记录
    // ? 3. 被转赠人可以看到自己多了一个来源为转赠的藏品，也可以看到转赠记录
    // ? 4. 双方都可以根据被转赠的nft_id来查看该藏品的转赠记录
  }
}
