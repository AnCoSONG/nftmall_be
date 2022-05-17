import { InjectRedis } from '@liaoliaots/nestjs-redis';
import {
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { BadRequestException, Logger } from '@nestjs/common';
import { Job } from 'bull';
import Redis from 'ioredis';
import { BsnService } from '../bsn/bsn.service';
import { ProductItemsService } from '../product-items/product-items.service';
import { ProductsService } from '../products/products.service';

@Processor('affair')
export class AffairProcessor {
  private readonly logger = new Logger(AffairProcessor.name);
  constructor(
    private readonly bsnService: BsnService,
    private readonly productsService: ProductsService,
    private readonly productItemsService: ProductItemsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}
  @Process('update-nft-class-id')
  async createNftClass(job: Job) {
    // 检测区块链事务是否已完成
    // console.log(job.data);
    const tx_res = await this.bsnService.get_transactions(
      job.data.operation_id,
    );
    // console.log(tx_res);
    if (tx_res.code) {
      this.logger.warn('get tx error, ' + tx_res.code);
      throw new BadRequestException('Get Tx Error');
    }
    if (tx_res.status !== 1) {
      this.logger.warn('create nft class incomplete, ' + tx_res.status);
      throw new BadRequestException('Create nft class has not finished.');
    }
    // finished
    if (tx_res.class_id && tx_res.class_id !== '') {
      this.logger.log('create nft class complete');
      const updateRes = await this.productsService.update(job.data.product_id, {
        nft_class_id: tx_res.class_id,
      });
      this.logger.log(`update nft class id of ${job.data.product_id} complete`);
      return updateRes;
    } else {
      throw new BadRequestException('Class id is null or empty');
    }
  }

  @Process('create-product-items')
  async createProductItems(job: Job) {
    this.redis.set(
      `queue:status:create-product-items:${job.data.product_id}`,
      'processing',
    );
    for (let i = 0; i < job.data.count; i++) {
      const createRes = await this.productItemsService.create({
        product_id: job.data.product_id,
        no: i,
      });
      this.logger.log(
        `${createRes.product_id} ${createRes.no} ${createRes.id}`,
      );
      job.progress((i / job.data.count) * 100);
    }
  }

  // todo: 增加一个任务表或者用某种方式记录这些任务的状态
  @OnQueueProgress({ name: 'create-product-items' })
  onCreateProductItemsProgress(job: Job, progress: number) {
    this.logger.log(`${job.id} - ${job.name} - ${progress}`);
  }

  @OnQueueCompleted({ name: 'create-product-items' })
  async onCreateProductItemsComplete(job: Job) {
    this.logger.log(`${job.id} - ${job.name} - complete!`);
    // 在complete 之后，向redis内添加
    const res = await this.redis.del(
      `queue:status:create-product-items:${job.data.product_id}`,
    );
    this.logger.log(
      `${job.id} - ${job.name}: delete redis status mark: ${res}`,
    );
  }

  @OnQueueFailed({ name: 'create-product-items' })
  onCreateProductItemsFailed(job: Job, err: Error) {
    this.logger.error(err);
    this.redis.set(
      `queue:status:create-product-items:${job.data.product_id}`,
      'failed',
    );
  }

  @Process('update-product-item-nft-id')
  async updateProductItemNftId(job: Job) {
    // 拉取新的事务结果
    this.logger.log('try to update product item nft id');
    const tx_res = await this.bsnService.get_transactions(
      job.data.operation_id,
    );
    if (tx_res.code) {
      this.logger.warn('get tx error, ' + tx_res.code);
      throw new BadRequestException('Get Tx Error');
    }
    if (tx_res.status !== 1) {
      this.logger.warn('update nft id incomplete, ' + tx_res.status);
      throw new BadRequestException('Update nft id has not finished.');
    }
    // 更新
    const updateRes = await this.productItemsService.update(
      job.data.product_item_id,
      {
        nft_id: tx_res.nft_id,
      },
    );
    this.logger.log(
      `update nft id of ${job.data.product_item_id} with ${tx_res.nft_id} complete`,
    );
    return updateRes;
  }
}
