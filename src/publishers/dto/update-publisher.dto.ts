import { PartialType } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';
import { CreatePublisherDto } from './create-publisher.dto';

export class UpdatePublisherDto extends PartialType(CreatePublisherDto) {
  works: Product[];
  // bsn_address一经创建不可update
}
