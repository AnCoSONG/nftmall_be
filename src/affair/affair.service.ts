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
import { sqlExceptionCatcher } from '../common/utils';
import { DayjsService } from '../lib/dayjs/dayjs.service';
import { OrdersService } from '../orders/orders.service';
import { ProductItemsService } from '../product-items/product-items.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
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
        this.schedulerRegistry.deleteTimeout(
          `seckill:drawend:${createProductRes.id}`,
        );
      }, this.dayjsService.dayjsify(createProductRes.draw_end_timestamp) - this.dayjsService.dayjsify()),
    );

    //* 生成假数据
    //! 后期去掉！
    this.schedulerRegistry.addTimeout(
      `seckill:draw:${createProductRes.id}`,
      setTimeout(async () => {
        await this.redis.sadd(`seckill:drawset:${createProductRes.id}`, 1);
        await this.redis.sadd(`seckill:drawset:${createProductRes.id}`, 2);
        await this.redis.sadd(`seckill:drawset:${createProductRes.id}`, 3);
        this.logger.log('Fake data generated');
        this.schedulerRegistry.deleteTimeout(
          `seckill:draw:${createProductRes.id}`,
        );
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
   * @returns 1 成功
   */
  async participate_draw(collector_id: number, product_id: string) {
    // 检查是否存在
    await this.collectorService.findOne(collector_id);
    // 参与用户
    const drawRes = await this.redis.sadd(
      `seckill:drawset:${product_id}`,
      collector_id,
    );
    return drawRes; // 返回结果
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

  /**
   * 根据product id清空秒杀缓存
   * 包括 ：
   * seckill:stock:<product_id>
   * sale_timestamp
   * seckill:drawset:<product_id>
   * seckill:luckyset:<product_id>
   * drawend timeout
   * @param product_id
   */
  async clearSeckillCache(product_id: string) {
    throw new NotImplementedException(product_id);
  }

  /**
   * 秒杀接口
   * @param collector_id 买家id
   * @param product_id 藏品id
   * @returns 抢购结果
   */
  async seckill(collector_id: number, product_id: string) {
    // lua脚本
    // 资格检查 collector_id in luckyset?
    // 库存检查 decrby/decr 看decr之后数值是否大于等于0，小于0无效
    // 返回减库存之后的值作为用户能购买的no
    // local hasPerimission = redis.call('sismember', 'seckill:luckyset:${product_id}', collector_id) \nif (hasPermission == 0) then return -2 end \n local stock = redis.call('decr', 'seckill:stock:<product_id>') \n if (stock < 0) then return -1 end \n return stock \n
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
        );
      const order = await this.ordersService.create({
        product_item_id: product_item.id,
        buyer_id: collector_id,
      });
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

  // todo: 支付完成回调
  // 1. 设置订单数据，用户积分更新
  // 2. 队列任务：用户在链上铸造一个nft，ownera为用户自己的地址，铸造完成后绑定nft_id即可完成确权
  // ? (用户花的能量是应用方的能力对吧？)
  // 3. 返回订单数据
  async payment_complete(order_id: string) {
    throw new NotImplementedException(order_id);
  }

  /**
   * todo
   * 超时未支付：归还库存，并设置为已超时
   * @param collector_id
   * @param product_id
   */
  async payment_timeout(
    collector_id: number,
    product_id: string,
    order_id: string,
  ) {
    throw new NotImplementedException(collector_id + product_id + order_id);
  }
}
