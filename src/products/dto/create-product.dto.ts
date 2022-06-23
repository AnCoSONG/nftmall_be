import { ApiProperty } from '@nestjs/swagger';
import { ProductAttribute, SupportType, Tag } from '../../common/const';
import { Genre } from '../../genres/entities/genre.entity';

export class CreateProductDto {
  @ApiProperty({
    description: '商品名称',
    example: '测试<藏品>',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: '商品详情',
    example: '测试描述，暂时还用不到',
    required: true,
  })
  description: string;

  @ApiProperty({
    description: '藏品预览图(首页)',
    example: 'https://picsum.photos/400/300?random=3',
    required: true,
  })
  preview_img: string;

  @ApiProperty({
    description: '藏品购买页预览资源（图片或模型)',
    example: 'https://mall-1308324841.file.myqcloud.com/3D/hu.0.glb',
    required: true,
  })
  preview_src: string;

  @ApiProperty({
    description: '藏品真实资源',
    example: 'https://mall-1308324841.file.myqcloud.com/3D/hu.0.glb',
    required: true,
  })
  src: string;

  @ApiProperty({
    description: '藏品海报',
    example: 'https://picsum.photos/400/300?random=3',
    required: true
  })
  poster: string;

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
    example: 10,
    required: false,
  })
  publish_count: number;

  @ApiProperty({
    description: '商品库存数量',
    example: 10,
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
    description: '商品特殊属性表集',
    enum: ProductAttribute,
    example: ProductAttribute.normal
  })
  attribute: ProductAttribute

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
    description: '发售时间',
    example: new Date(),
    required: true,
  })
  sale_timestamp: Date;

  @ApiProperty({
    description: '商品发行商',
    example: undefined,
  })
  publisher_id: string;

  @ApiProperty({
    description: '商品类别',
    example: [{ name: '传统文化' }, { name: '复古' }, { name: '国潮' }],
    required: false,
  })
  genres: Genre[];
}
