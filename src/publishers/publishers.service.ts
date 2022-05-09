import {
  BadRequestException,
  Injectable,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlExceptionCatcher } from '../common/utils';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { Publisher } from './entities/publisher.entity';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productService: ProductsService,
  ) {}
  async create(createPublisherDto: CreatePublisherDto) {
    const publisher = this.publisherRepository.create(createPublisherDto);

    const createRes = await sqlExceptionCatcher(
      this.publisherRepository.save(publisher),
    );
    // todo: 通过queue添加一个上链任务
    return createRes;
  }

  async findAll() {
    return await sqlExceptionCatcher(
      this.publisherRepository.find({ relations: ['works'] }),
    );
  }

  async list(page: number, limit: number) {
    const [data, total] = await sqlExceptionCatcher(
      this.publisherRepository.findAndCount({
        relations: ['works'],
        skip: (page - 1) * limit,
        take: limit,
      }),
    );
    return { data, total };
  }

  async findOne(id: number) {
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
    // must guarantee the product is not duplication of existing product
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
    //! 使用service的create语句，内部会对genre的重复性和自动添加做处理
    return await this.productService.create(createProductDto);
  }

  async findOneWorks(id: number) {
    const publisher = await this.findOne(id);
    return publisher.works;
  }

  async update(
    id: number,
    updatePublisherDto: Omit<UpdatePublisherDto, 'works'>,
  ) {
    const publisher = await this.findOne(id);
    const merged = this.publisherRepository.merge(
      publisher,
      updatePublisherDto,
    );
    return await sqlExceptionCatcher(this.publisherRepository.save(merged));
  }

  async remove(id: number) {
    const publisher = await this.findOne(id);
    return await sqlExceptionCatcher(
      this.publisherRepository.softRemove(publisher),
    );
  }
}
