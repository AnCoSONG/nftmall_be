import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

export class CreatePublisherDto {
  name: string;
  avatar: string;
  works?: Product[] = [];
}
