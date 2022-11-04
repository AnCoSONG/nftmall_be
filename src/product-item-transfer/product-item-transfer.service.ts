import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { transferStatus } from '../common/const';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { CreateProductItemTransferDto } from './dto/create-product-item-transfer.dto';
import { UpdateProductItemTransferDto } from './dto/update-product-item-transfer.dto';
import { ProductItemTransfer } from './entities/product-item-transfer.entity';

@Injectable()
export class ProductItemTransferService {
  private readonly logger = new Logger(ProductItemTransfer.name);
  constructor(
    @InjectRepository(ProductItemTransfer)
    private readonly productItemTransferRepository: Repository<ProductItemTransfer>,
  ) {}
  async create(createProductItemTransferDto: CreateProductItemTransferDto) {
    const transferItem = this.productItemTransferRepository.create(
      createProductItemTransferDto,
    );
    const created_item = (await sqlExceptionCatcher(
      this.productItemTransferRepository.save(transferItem),
    )) as ProductItemTransfer;
    return created_item;
  }

  async findAll(with_relation: boolean = false) {
    return await sqlExceptionCatcher(
      this.productItemTransferRepository.find({
        relations: with_relation
          ? [
              'sender',
              'receiver',
              'original_product_item',
              'target_product_item',
              'original_product_item.product',
            ]
          : [],
      }),
    );
  }

  async list(
    collectorId: number,
    page: number,
    limit: number,
    with_relation: boolean,
  ) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.productItemTransferRepository.findAndCount({
        where: [{ sender_id: collectorId }, { receiver_id: collectorId }],
        order: { update_date: 'DESC' },
        relations: with_relation
          ? [
              'sender',
              'receiver',
              'original_product_item',
              'target_product_item',
              'original_product_item.product',
            ]
          : [],
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

  async findOne(id: string, with_relation: boolean = false) {
    const transfer = await sqlExceptionCatcher(
      this.productItemTransferRepository.findOne(id, {
        relations: with_relation
          ? [
              'sender',
              'receiver',
              'original_product_item',
              'target_product_item',
            ]
          : [],
      }),
    );
    if (!transfer) {
      throw new NotFoundException(`无法找到ID:${id}的转赠`);
    }
    return transfer as ProductItemTransfer;
  }

  async transferFailed(id: string, operation_id: string) {
    return await this.update(id, {
      status: transferStatus.FAILED,
      operation_id,
    });
  }

  async transferProcessing(id: string, operation_id: string) {
    return await this.update(id, {
      status: transferStatus.PROCESSING,
      operation_id,
    });
  }

  async transferSuccess(id: string, operation_id: string, target_product_item_id: string, tx_hash: string, tx_success_time: Date) {
    return await this.update(id, {
      status: transferStatus.SUCCESS,
      operation_id,
      target_product_item_id,
      tx_hash,
      tx_success_time,
    });
  }

  async transferPending(id: string, operation_id: string) {
    return await this.update(id, {
      status: transferStatus.PENDING,
      operation_id,
    });
  }

  async update(
    id: string,
    updateProductItemTransferDto: UpdateProductItemTransferDto,
  ) {
    const transfer = await this.findOne(id);
    const merged = this.productItemTransferRepository.merge(
      transfer,
      updateProductItemTransferDto,
    );
    return await sqlExceptionCatcher(
      this.productItemTransferRepository.save(merged),
    );
  }

  async remove(id: string) {
    const transfer = await this.findOne(id);
    return await sqlExceptionCatcher(
      this.productItemTransferRepository.remove(transfer),
    );
  }
}
