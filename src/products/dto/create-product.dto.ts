import { ApiProperty } from '@nestjs/swagger';
import { SupportType, Tag } from '../../common/const';
import { Genre } from '../../genres/entities/genre.entity';

export class CreateProductDto {
  @ApiProperty({
    description: '商品名称',
    example: '中国第一颗卫星数字珍藏',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: '商品详情',
    example: '1970年4月24日，东方红一号卫星在酒泉发射成功，世界为之震动。',
    required: true,
  })
  description: string;

  @ApiProperty({
    description: '商品预览图',
    example: 'https://picsum.photos/400/300',
    required: true,
  })
  preview_img: string;

  @ApiProperty({
    description: '商品资源',
    example: 'https://picsum.photos/500/500',
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
      { name: '复兴风华', mode: 'light' },
      { name: '宝藏计划', mode: 'dark' },
    ],
    required: true,
  })
  tags: Tag[];

  @ApiProperty({ description: '商品价格', example: '25.50', required: true })
  price: string;

  @ApiProperty({
    description: '藏品详情',
    example: [
      'https://picsum.photos/400/800?random=1',
      'https://picsum.photos/400/600?random=2',
      'https://picsum.photos/400/400?random=3',
      'https://picsum.photos/400/300?random=4',
      'https://picsum.photos/400/900?random=5',
    ],
    required: true,
  })
  details: string[];

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
    description: '发售时间',
    example: new Date(),
    required: true,
  })
  sale_timestamp: Date;

  @ApiProperty({
    description: '抽签开始时间',
    example: new Date(),
    required: true,
  })
  draw_timestamp: Date;

  @ApiProperty({
    description: '抽签结束时间',
    example: new Date(),
    required: true,
  })
  draw_end_timestamp: Date;

  @ApiProperty({
    description: '商品发行商',
    required: true,
  })
  publisher_id: number;

  @ApiProperty({
    description: 'nft类别id',
    required: true,
  })
  nft_class_id: string;

  @ApiProperty({
    description: '商品类别',
    example: [{ name: '传统文化' }, { name: '国风' }],
    required: false,
  })
  genres: Genre[];
}
