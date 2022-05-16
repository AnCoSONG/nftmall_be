import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ProductItem } from '../../product-items/entities/product-item.entity';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    description: 'nft类别id',
    required: false,
    example: undefined,
  })
  nft_class_id?: string | null;

  @ApiProperty({
    example: [],
  })
  items?: ProductItem[];
}
