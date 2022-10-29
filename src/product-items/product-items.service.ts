import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Not, Repository } from 'typeorm';
import { onChainStatus, productItemStatus } from '../common/const';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { ProductsService } from '../products/products.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ProductItem } from './entities/product-item.entity';

@Injectable()
export class ProductItemsService {
  private readonly logger = new Logger(ProductItemsService.name);
  constructor(
    @InjectRepository(ProductItem)
    private readonly productItemRepository: Repository<ProductItem>,
    private readonly productsService: ProductsService,
  ) {}
  async create(createProductItemDto: CreateProductItemDto) {
    //* 检查是否有这个id
    const product = await sqlExceptionCatcher(
      this.productsService.findOne(createProductItemDto.product_id, true),
    );
    const product_item =
      this.productItemRepository.create(createProductItemDto);
    const created_item = await sqlExceptionCatcher(
      this.productItemRepository.save(product_item),
    );
    created_item.product = product;
    return created_item;
  }

  // _createBatch(product_id: string, count: number) {
  //   return new Array(count).fill(0).map((item, index) => {
  //     return this.productItemRepository.create({ product_id, no: index });
  //   });
  // }

  async findAll(with_relation = false) {
    return await sqlExceptionCatcher(
      this.productItemRepository.find({
        relations: with_relation ? ['product', 'owner'] : [],
      }),
    );
  }

  async query(
    page = 1,
    limit = 10,
    with_relation = true,
    id = '',
    product_id = '',
    owner = '',
  ) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.productItemRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_relation
          ? ['product', 'owner', 'product.publisher']
          : [],
        where: {
          id: Like(`%${id ?? ''}%`),
          product_id: Like(`%${product_id ?? ''}%`),
          owner: { username: Like(`%${owner ?? ''}%`) },
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

  async list(
    collector_id: number,
    page: number,
    limit: number,
    with_relation = false,
  ) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.productItemRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_relation
          ? ['product', 'owner', 'product.publisher']
          : [],
        where: {
          owner_id: collector_id,
          status: Not(productItemStatus.TRANSFERED),
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

  async findOne(id: string, with_relation = false) {
    const product_item = await sqlExceptionCatcher(
      this.productItemRepository.findOne(id, {
        relations: with_relation
          ? ['product', 'owner', 'product.publisher']
          : [],
      }),
    );
    if (!product_item) {
      throw new NotFoundException(`Product Item with ID ${id} not found`);
    }
    return product_item as ProductItem;
  }

  async findOneByUser(id: string, collector_id: string, with_relation = false) {
    const product_item = await sqlExceptionCatcher(
      this.productItemRepository.findOne(id, {
        where: { owner_id: collector_id },
        relations: with_relation
          ? ['product', 'owner', 'product.publisher']
          : [],
      }),
    );
    if (!product_item) {
      throw new NotFoundException(`Product Item with ID ${id} not found`);
    }
    return product_item as ProductItem;
  }

  async findOneByProductIdAndNo(
    product_id: string,
    no: number,
    with_relation = false,
  ) {
    const product_item = await this.productItemRepository.findOne(
      {
        product_id: product_id,
        no: no,
      },
      {
        relations: with_relation ? ['product', 'owner'] : [],
      },
    );
    if (!product_item) {
      throw new NotFoundException(
        `Product Item with ${product_id} - ${no} is not found`,
      );
    }
    return product_item;
  }

  async onChainProcessing(id: string, operation_id: string) {
    return await this.update(id, {
      on_chain_status: onChainStatus.PROCESSING,
      operation_id,
    });
  }

  async onChainFail(id: string, operation_id: string) {
    return await this.update(id, {
      on_chain_status: onChainStatus.FAILED,
      operation_id,
    });
  }

  async onChainPending(id: string, operation_id: string) {
    return await this.update(id, {
      on_chain_status: onChainStatus.PENDING,
      operation_id,
    });
  }

  async onChainSuccess(
    id: string,
    nft_id: string,
    nft_class_id: string,
    operation_id: string,
    tx_hash: string,
    timestamp: string,
  ) {
    this.logger.log(`[ON CHAIN SUCCESS] ${nft_class_id} ${nft_id} ${tx_hash}`);
    return await this.update(id, {
      nft_id,
      nft_class_id,
      operation_id,
      on_chain_status: onChainStatus.SUCCESS,
      on_chain_timestamp: new Date(timestamp),
      tx_hash,
    });
  }

  async getCollectionCount(collector_id: number, product_id: string) {
    const count = await sqlExceptionCatcher(
      this.productItemRepository.count({
        where: {
          owner_id: collector_id,
          product_id,
        },
      }),
    );
    return count;
  }

  async update(id: string, updateProductItemDto: UpdateProductItemDto) {
    const product_item = await this.findOne(id);
    const merged = this.productItemRepository.merge(
      product_item,
      updateProductItemDto,
    );
    return await sqlExceptionCatcher(this.productItemRepository.save(merged));
  }

  async remove(id: string) {
    //! danger: hard remove, do not use in production
    const product_item = await this.findOne(id);
    // todo: remove nft id
    return await sqlExceptionCatcher(
      this.productItemRepository.remove(product_item),
    );
  }
}
