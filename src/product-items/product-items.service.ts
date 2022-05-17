import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { ProductsService } from '../products/products.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ProductItem } from './entities/product-item.entity';

@Injectable()
export class ProductItemsService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly productItemRepository: Repository<ProductItem>,
    private readonly productsService: ProductsService,
  ) {}
  async create(createProductItemDto: CreateProductItemDto) {
    //* 检查是否有这个id
    await sqlExceptionCatcher(
      this.productsService.findOne(createProductItemDto.product_id),
    );
    const product_item =
      this.productItemRepository.create(createProductItemDto);
    return await sqlExceptionCatcher(
      this.productItemRepository.save(product_item),
    );
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

  async list(page: number, limit: number, with_relation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.productItemRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_relation ? ['product', 'owner'] : [],
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
        relations: with_relation ? ['product', 'owner'] : [],
      }),
    );
    if (!product_item) {
      throw new NotFoundException(`Product Item with ID ${id} not found`);
    }
    return product_item;
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
