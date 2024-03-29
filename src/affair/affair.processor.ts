import { InjectRedis } from '@liaoliaots/nestjs-redis';
import {
  OnQueueActive,
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
import { BSN_TX_STATUS, onChainStatus, productItemSource, productItemStatus } from '../common/const';
import { ProductItemTransferService } from '../product-item-transfer/product-item-transfer.service';
import { ProductItem } from '../product-items/entities/product-item.entity';
import { ProductItemsService } from '../product-items/product-items.service';
import { ProductsService } from '../products/products.service';
import { AffairService } from './affair.service';

@Processor('affair')
export class AffairProcessor {
  private readonly logger = new Logger(AffairProcessor.name);
  constructor(
    private readonly affairService: AffairService,
    private readonly bsnService: BsnService,
    private readonly productsService: ProductsService,
    private readonly productItemsService: ProductItemsService,
    private readonly productItemTransferService: ProductItemTransferService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Process('update-nft-class-id')
  async createNftClass(job: Job<{ operation_id: string; product_id: string }>) {
    // 检测区块链事务是否已完成
    const tx_res = await this.bsnService.get_transactions(
      job.data.operation_id,
    );
    // console.log(tx_res);
    if (tx_res.code) {
      this.logger.warn('get tx error, ' + tx_res.code);
      await this.productsService.onChainFail(
        job.data.product_id,
        job.data.operation_id,
      );
      throw new BadRequestException('Get Tx Error');
    }

    if (tx_res.status === BSN_TX_STATUS.PENDING) {
      this.logger.warn(`create nft class: pending`);
      await this.productsService.onChainPending(
        job.data.product_id,
        job.data.operation_id,
      );
      throw new Error('create nft class: pending');
    }
    if (tx_res.status === BSN_TX_STATUS.PROCESSING) {
      this.logger.warn(`create nft class: processing`);
      await this.productsService.onChainProcessing(
        job.data.product_id,
        job.data.operation_id,
      );
      throw new Error('create nft class: processing');
    }
    if (tx_res.status === BSN_TX_STATUS.FAILED) {
      this.logger.warn(`create nft class: failed`);
      await this.productsService.onChainFail(
        job.data.product_id,
        job.data.operation_id,
      );
      throw new Error('create nft class: failed');
    }
    // finished
    if (tx_res.class_id && tx_res.class_id !== '' && tx_res.tx_hash !== '') {
      this.logger.log(
        'create nft class complete, success tx hash: ' +
          tx_res.tx_hash +
          ' ' +
          tx_res.timestamp,
      );
      const updateRes = await this.productsService.onChainSuccess(
        job.data.product_id,
        tx_res.class_id,
        tx_res.tx_hash, // 只在成功时才有交易哈希
      );
      this.logger.log(`update nft class id of ${job.data.product_id} complete`);
      return updateRes;
    } else {
      throw new Error('Class id or tx_hash is null or empty');
    }
  }

  @OnQueueActive({ name: 'update-nft-class-id' })
  onUpdateNftClassActive(job: Job) {
    this.logger.log(`${job.id} - ${job.name} - active!`);
  }

  @Process('create-product-items')
  async createProductItems(job: Job) {
    this.redis.set(
      `queue:status:create-product-items:${job.data.product_id}`,
      'processing',
    );
    // begin from 1, like: [1, count]
    for (let i = 1; i <= job.data.count; i++) {
      const createRes = await this.productItemsService.create({
        product_id: job.data.product_id,
        no: i,
        source: productItemSource.BUY,
      });
      this.logger.log(
        `create-product-items: ${createRes.product_id} ${createRes.no} ${createRes.id}`,
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
  async updateProductItemNftId(
    job: Job<{
      product_item_id: string;
      nft_class_id: string;
      operation_id: string;
    }>,
  ) {
    // 拉取新的事务结果
    this.logger.log('[UPDATE NFT ID] Try to update product item nft id');
    const tx_res = await this.bsnService.get_transactions(
      job.data.operation_id,
    );
    if (tx_res.code) {
      this.logger.warn('[UPDATE NFT ID] Get tx error, ' + tx_res.code);
      await this.productItemsService.onChainFail(
        job.data.product_item_id,
        job.data.operation_id,
      );
      throw new Error('Get Tx Error');
    }
    if (tx_res.status === BSN_TX_STATUS.PENDING) {
      this.logger.warn('[UPDATE NFT ID] update nft id: pending');
      await this.productItemsService.onChainPending(
        job.data.product_item_id,
        job.data.operation_id,
      );
      throw new Error('Update nft id has not finished.');
    }
    if (tx_res.status === BSN_TX_STATUS.PROCESSING) {
      this.logger.warn('[UPDATE NFT ID] update nft id: processing');
      await this.productItemsService.onChainProcessing(
        job.data.product_item_id,
        job.data.operation_id,
      );
      throw new Error('update nft id: processing');
    }
    if (tx_res.status === BSN_TX_STATUS.FAILED) {
      this.logger.error(`[UPDATE NFT ID] update nft id: failed`);
      await this.productItemsService.onChainFail(
        job.data.product_item_id,
        job.data.operation_id,
      );
      throw new Error('update nft id: failed');
    }
    // 更新
    if (tx_res.nft_id && tx_res.nft_id !== '' && tx_res.tx_hash !== '') {
      this.logger.log('create nft success, success tx hash: ' + tx_res.tx_hash);
      const updateRes = await this.productItemsService.onChainSuccess(
        job.data.product_item_id,
        tx_res.nft_id,
        job.data.nft_class_id,
        job.data.operation_id,
        tx_res.tx_hash, // 只在成功时才有交易哈希
        tx_res.timestamp, // 更新为更准确的上链时间
      );
      this.logger.log(
        `[UPDATE NFT ID] update nft id of ${job.data.product_item_id} with ${tx_res.nft_id} complete`,
      );
      return updateRes;
    } else {
      this.logger.error(
        '[UPDATE NFT ID] update nft id: failed: nft id or tx_hash is null or empty',
      );
      this.productItemsService.onChainFail(
        job.data.product_item_id,
        job.data.operation_id,
      );
      throw new Error('Nft id is null or empty');
    }
  }

  @OnQueueActive({ name: 'update-product-item-nft-id' })
  onUpdateProductItemNftIdActive(job: Job) {
    this.logger.log(`${job.id} - ${job.name} - active!`, '[UPDATE NFT ID]');
  }

  @Process('gen-lucky-set')
  async genLuckySetDelayed(
    job: Job<{
      product_id: string;
      draw_count: number;
    }>,
  ) {
    // 检测是否已生成
    return await this.affairService.genLuckySet(
      job.data.product_id,
      job.data.draw_count,
    );
  }

  @OnQueueActive({ name: 'gen-lucky-set' })
  onGenLuckySetActive(job: Job) {
    this.logger.log(`${job.id} - ${job.name} - active!`);
  }

  @OnQueueCompleted({ name: 'gen-lucky-set' })
  async onGenLuckySetComplete(
    job: Job<{
      product_id: string;
      draw_count: number;
    }>,
  ) {
    this.logger.log(`${job.id} - ${job.name} - complete!`);
    // 完成后自动删除
    await this.redis.del(`gen_lucky_set:${job.data.product_id}`);
  }

  @Process('update-transfer-nft-status')
  async updateTransferNftStatus(
    job: Job<{
      product_item_transfer_id: string;
      operation_id: string;
      old_product_item: ProductItem,
      receiver_id: number
    }>,
  ) {
    const tx_res = await this.bsnService.get_transactions(
      job.data.operation_id,
    );
    if (tx_res.code) {
      this.logger.warn(
        `[UPDATE TRANSFER NFT STATUS] Get tx error, ${job.data.operation_id}`,
      );
      await this.productItemTransferService.transferFailed(
        job.data.product_item_transfer_id,
        job.data.operation_id,
      );
      throw new Error('Get Tx Error');
    }
    if (tx_res.status === BSN_TX_STATUS.PENDING) {
      this.logger.warn(
        `[UPDATE TRANSFER NFT STATUS] update nft id: pending, ${job.data.operation_id}`,
      );
      await this.productItemTransferService.transferPending(
        job.data.product_item_transfer_id,
        job.data.operation_id,
      );
      throw new Error('Update nft id has not finished.');
    } else if (tx_res.status === BSN_TX_STATUS.PROCESSING) {
      this.logger.warn(
        `[UPDATE TRANSFER NFT STATUS] update nft id: processing, ${job.data.operation_id}`,
      );
      await this.productItemTransferService.transferProcessing(
        job.data.product_item_transfer_id,
        job.data.operation_id,
      );
      throw new Error('update nft id: processing');
    } else if (tx_res.status === BSN_TX_STATUS.FAILED) {
      this.logger.error(
        `[UPDATE TRANSFER NFT STATUS] update nft id: failed, ${job.data.operation_id}`,
      );
      await this.productItemTransferService.transferFailed(
        job.data.product_item_transfer_id,
        job.data.operation_id,
      );
      throw new Error('update nft id: failed');
    } else if (tx_res.status === BSN_TX_STATUS.SUCCESS) {
      this.logger.log(
        'transfer nft success, success tx hash: ' +
          tx_res.tx_hash +
          '  nft_id: ' +
          tx_res.nft_id +
          '  nft_class_id: ' +
          tx_res.class_id + 
          '  origin_nft_id:' + job.data.old_product_item.nft_id + 
          '  origin_nft_class_id' + job.data.old_product_item.nft_class_id
      );
      // * 创建一个相同的productItem给受赠者账户
      const transferedProductItem = await this.productItemsService.create({
        product_id: job.data.old_product_item.product_id,
        nft_id: tx_res.nft_id,
        nft_class_id: tx_res.class_id,
        owner_id: job.data.receiver_id,
        source: productItemSource.TRANSFER, // 转赠
        no: job.data.old_product_item.no,
        operation_id: job.data.operation_id,
        tx_hash: tx_res.tx_hash, // 转赠tx_hash
        on_chain_status: onChainStatus.SUCCESS,
        on_chain_timestamp: new Date(tx_res.timestamp), // 转赠时间
        status: productItemStatus.DEFAULT
      })

      // * 旧productItem设置为transfered
      const oldTransferedRes = await this.productItemsService.update(job.data.old_product_item.id, {
        status: productItemStatus.TRANSFERED
      });

      // * 更新productItemTransfer的状态为成功
      const transferSuccessRes = await this.productItemTransferService.transferSuccess(
        job.data.product_item_transfer_id,
        job.data.operation_id,
        transferedProductItem.id,
        tx_res.tx_hash,
        new Date(tx_res.timestamp)
      )
      return {
        transferedProductItem,
        oldTransferedRes,
        transferSuccessRes
      }
    }
  }
}
