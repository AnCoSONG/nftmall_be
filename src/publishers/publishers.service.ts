import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Injectable,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { Repository } from 'typeorm';
import { BsnService } from '../bsn/bsn.service';
import { sqlExceptionCatcher } from '../common/utils';
import { requestKeyErrorException } from '../exceptions';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { Publisher } from './entities/publisher.entity';

@Injectable()
export class PublishersService {
  private readonly logger = new Logger(PublishersService.name);
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productService: ProductsService,
    private readonly bsnService: BsnService,
  ) {}

  async create(createPublisherDto: CreatePublisherDto) {
    // 上链 -> 创建
    const publisher = this.publisherRepository.create(createPublisherDto);
    const chainRes = await this.bsnService.create_account(`${publisher.name}`);
    console.log(chainRes);
    if (chainRes.code) {
      throw new BadRequestException(chainRes.message);
    } else {
      // 上链成功
      publisher.bsn_address = chainRes.account;
      const createRes = await sqlExceptionCatcher(
        this.publisherRepository.save(publisher),
      );
      return {
        createRes,
        chainRes,
      };
    }
  }

  async findAll() {
    return await sqlExceptionCatcher(
      this.publisherRepository.find({ relations: ['works'] }),
    );
  }

  async list(page: number, limit: number, with_relation = false) {
    if (page <= 0 || limit <= 0) {
      throw new requestKeyErrorException(
        'page and limit must be greater than 0',
      );
    }
    const [data, total] = await sqlExceptionCatcher(
      this.publisherRepository.findAndCount({
        relations: with_relation ? ['works'] : [],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const publisher = await sqlExceptionCatcher(
      this.publisherRepository.findOne(id, {
        relations: ['works'], // relations should be the field in entity
      }),
    );
    if (!publisher) {
      throw new NotFoundException(`Publisher with ID "${id}" not found`);
    }
    return publisher;
  }

  async publishNewProduct(publisher_name, createProductDto: CreateProductDto) {
    //* must guarantee the product is not duplication of existing product
    const publisher = await sqlExceptionCatcher(
      this.publisherRepository.findOne({
        name: publisher_name,
      }),
    );
    if (!publisher) {
      throw new NotFoundException(
        `Publisher with name "${publisher_name}" not found`,
      );
    }
    createProductDto.publisher_id = publisher.id;
    console.log(createProductDto);
    // 用这些参数申请创建一个nft_class
    if (!publisher.bsn_address) {
      throw new BadRequestException('publisher.bsn_address is not defined.');
    }
    const createNftClassRes = await this.bsnService.create_nft_class({
      owner: publisher.bsn_address,
      name: createProductDto.name,
    });
    if (createNftClassRes.code) {
      throw new BadRequestException(createNftClassRes.message);
    } else {
      // 通过队列去实现 nft_class_id 的设置
    }
    return await this.productService.create(createProductDto);
  }

  async findOneWorks(id: string) {
    const publisher = await this.findOne(id);
    return publisher.works;
  }

  async update(
    id: string,
    updatePublisherDto: Omit<UpdatePublisherDto, 'works'>,
  ) {
    const publisher = await this.findOne(id);
    const merged = this.publisherRepository.merge(
      publisher,
      updatePublisherDto,
    );
    return await sqlExceptionCatcher(this.publisherRepository.save(merged));
  }

  async remove(id: string) {
    //! danger: hard remove, do not use in production
    const publisher = await this.findOne(id);
    return await sqlExceptionCatcher(
      this.publisherRepository.remove(publisher),
    );
  }
}
