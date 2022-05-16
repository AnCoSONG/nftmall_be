import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BsnService } from '../bsn/bsn.service';
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
    private readonly bsnService: BsnService,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    if (!createProductDto.publisher_id) {
      // 理论上不需要这一行验证，因为在创建时，publisher_id是必须的
      throw new requestKeyErrorException('publisher_id is required');
    }
    if (
      !(
        createProductDto.draw_end_timestamp > createProductDto.draw_timestamp &&
        createProductDto.draw_end_timestamp < createProductDto.sale_timestamp
      )
    ) {
      throw new BadRequestException(
        'timestamp should be like: draw timestamp < draw end timestamp < sale timestamp',
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
  async list(page: number, limit: number) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [result, total] = await sqlExceptionCatcher(
      this.productRepository.findAndCount({
        order: { update_date: 'DESC' },
        relations: ['genres', 'publisher'],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return {
      data: result,
      total,
    };
  }

  async findOne(id: string) {
    const product = await sqlExceptionCatcher(
      this.productRepository.findOne(id, {
        relations: ['genres', 'publisher'],
      }),
    );
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
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
