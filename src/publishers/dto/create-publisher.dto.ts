import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

export class CreatePublisherDto {
  @ApiProperty({ description: '发行商/创作者', example: '创作者' })
  name: string;

  @ApiProperty({
    description: '发行商/创作者头像',
    example: 'https://picsum.photos/120/120',
  })
  avatar: string;

  @ApiProperty({ required: false, example: [] })
  works?: Product[] = [];
}
