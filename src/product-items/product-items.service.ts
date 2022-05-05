import { Injectable } from '@nestjs/common';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';

@Injectable()
export class ProductItemsService {
  create(createProductItemDto: CreateProductItemDto) {
    return 'This action adds a new productItem';
  }

  findAll() {
    return `This action returns all productItems`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productItem`;
  }

  update(id: number, updateProductItemDto: UpdateProductItemDto) {
    return `This action updates a #${id} productItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} productItem`;
  }
}
