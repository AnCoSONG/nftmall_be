import { ApiProperty } from '@nestjs/swagger';
import { SupportType, Tag } from '../../common/const';
import { Genre } from '../../genres/entities/genre.entity';

export class CreateProductDto {
  @ApiProperty({ description: '商品名称', example: '飞天系列', required: true })
  name: string;

  @ApiProperty({
    description: '商品详情',
    example: '飞天系列',
    required: false,
  })
  description: string;

  @ApiProperty({
    description: '商品预览图',
    example: 'https://picsum.photos/200/300',
    required: true,
  })
  preview_img: string;

  @ApiProperty({
    description: '商品资源',
    example: 'https://picsum.photos/200/300',
    required: true,
  })
  src: string;

  @ApiProperty({
    description: '商品类型',
    example: SupportType.IMAGE,
    required: true,
    enum: SupportType,
  })
  type: SupportType;

  @ApiProperty({
    description: '商品标签',
    example: [
      { name: '美国', mode: 'light' },
      { name: '日本', mode: 'dark' },
    ],
    required: false,
  })
  tags: Tag[];

  @ApiProperty({ description: '商品价格', example: '100.00', required: true })
  price: number;

  @ApiProperty({
    description: '藏品详情',
    example: '富文本或者描述图片的数组',
    required: true,
  })
  details: string;

  @ApiProperty({
    description: '商品发售数量',
    example: 1000,
    required: false,
  })
  publish_count: number;

  @ApiProperty({
    description: '商品库存数量',
    example: 1000,
    required: false,
  })
  stock_count: number;

  @ApiProperty({
    description: '商品限购数量',
    example: 1,
    required: false,
  })
  limit: number;

  @ApiProperty({
    description: '商品发行商',
    required: true,
  })
  publisher_id: number;

  @ApiProperty({
    description: '商品类别',
    example: [{ name: '美国' }, { name: '日本' }],
    required: false,
  })
  genres: Genre[];
}
