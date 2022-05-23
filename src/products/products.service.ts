import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BsnService } from '../bsn/bsn.service';
import { onChainStatus } from '../common/const';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { Genre } from '../genres/entities/genre.entity';
import { DayjsService } from '../lib/dayjs/dayjs.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    private readonly bsnService: BsnService,
    private readonly dayjsService: DayjsService,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    //* 验证是否提交了publisher_id
    if (!createProductDto.publisher_id) {
      // 理论上不需要这一行验证，因为在创建时，publisher_id是必须的
      throw new requestKeyErrorException('publisher_id is required');
    }
    //* 验证timestamp是否合理
    const draw_end_dayjs = this.dayjsService.dayjsify(
      createProductDto.draw_end_timestamp,
    );
    const draw_dayjs = this.dayjsService.dayjsify(
      createProductDto.draw_timestamp,
    );
    const sale_dayjs = this.dayjsService.dayjsify(
      createProductDto.sale_timestamp,
    );
    const now_dayjs = this.dayjsService.dayjsify();
    if (
      !(
        // 验证timestamp是否按照正确大小顺序
        // now < draw < draw_end < sale
        (
          draw_end_dayjs > draw_dayjs &&
          draw_end_dayjs < sale_dayjs &&
          draw_dayjs > now_dayjs
        )
      )
    ) {
      throw new BadRequestException(
        'timestamp should be like: Now < draw timestamp < draw end timestamp < sale timestamp',
      );
    }
    const product = this.productRepository.create(createProductDto);
    if (createProductDto.genres) {
      // 检查dto里面是否有已经存在的genre
      product.genres = [];
      for (const genre of createProductDto.genres) {
        const genreEntity = await this.genreRepository.findOne({
          name: genre.name,
        });
        if (!genreEntity) {
          product.genres.push(this.genreRepository.create(genre));
        } else {
          product.genres.push(genreEntity);
        }
      }
    }
    return await sqlExceptionCatcher(this.productRepository.save(product));
  }

  async findAll() {
    return await sqlExceptionCatcher(
      this.productRepository.find({ relations: ['genres', 'publisher'] }),
    );
  }

  // cache last total and compare to page
  async list(page: number, limit: number, with_relation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.productRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: with_relation ? ['genres', 'publisher'] : [],
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

  async findOne(id: string, with_relation?: boolean) {
    const product = await sqlExceptionCatcher(
      this.productRepository.findOne(id, {
        relations: with_relation ? ['genres', 'publisher'] : undefined,
      }),
    );
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async onChainFail(id: string) {
    return await this.update(id, {
      on_chain_status: onChainStatus.FAILED,
    });
  }

  async onChainProcessing(id: string, operation_id: string) {
    return await this.update(id, {
      on_chain_status: onChainStatus.PROCESSING,
      operation_id: operation_id,
    });
  }

  async onChainSuccess(id: string, nft_class_id: string) {
    return await this.update(id, {
      nft_class_id,
      on_chain_status: onChainStatus.SUCCESS,
    });
  }

  async get_stock_count(id: string) {
    return await sqlExceptionCatcher(
      this.productRepository.findOne(id, { select: ['stock_count'] }),
    );
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    const merged = this.productRepository.merge(product, updateProductDto);
    if (updateProductDto.genres) {
      // 检查dto里面是否有已经存在的genre
      merged.genres = [];
      for (const genre of updateProductDto.genres) {
        const genreEntity = await this.genreRepository.findOne({
          name: genre.name,
        });
        if (genreEntity) {
          merged.genres.push(genreEntity);
        } else {
          const newGenre = this.genreRepository.create({ name: genre.name });
          merged.genres.push(newGenre);
        }
      }
    }
    return await sqlExceptionCatcher(this.productRepository.save(merged));
  }

  async remove(id: string) {
    ///! danger: hard remove, do not use in production
    const product = await this.findOne(id);
    return await sqlExceptionCatcher(this.productRepository.remove(product));
  }
}
