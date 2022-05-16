import { ApiProperty } from '@nestjs/swagger';
// import { Product } from '../../products/entities/product.entity';

export class CreatePublisherDto {
  @ApiProperty({ example: '树苍山西' })
  name: string;
  @ApiProperty({ example: 'https://picsum.photos/120/120?random=1' })
  avatar: string;
  // bsn_address 自动创建
}
