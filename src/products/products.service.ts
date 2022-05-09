import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { Genre } from '../genres/entities/genre.entity';
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
  ) {}
  async create(createProductDto: CreateProductDto) {
    if (!createProductDto.publisher_id) {
      // 理论上不需要这一行验证，因为在创建时，publisher_id是必须的
      throw new requestKeyErrorException('publisher_id is required');
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
  async list(page: number, limit: number) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [result, total] = await sqlExceptionCatcher(
      this.productRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: ['genres'],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return {
      data: result,
      total,
    };
  }

  async release(id: number) {
    // todo: 实现上链
    // 1. 对id进行校验

    // 2. 创建 Product-Item 对象 写入数据库

    // 3. 通过 Queue 提交上链请求

    // 4. Queue的回调完成上链请求包装

    // 5. 上链后 将 BSN_address 写入数据库

    // * PS: 这一套流程需要克隆一个类似的定时任务，已完成自动的上链

    throw new NotImplementedException();
  }

  async findOne(id: number) {
    const product = await sqlExceptionCatcher(
      this.productRepository.findOne(id, { relations: ['genres'] }),
    );
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
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

  async remove(id: number) {
    const product = await this.findOne(id);
    return await sqlExceptionCatcher(
      this.productRepository.softRemove(product),
    );
  }
}
