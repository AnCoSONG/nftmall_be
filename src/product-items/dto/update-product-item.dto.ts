import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateProductItemDto } from './create-product-item.dto';

export class UpdateProductItemDto extends PartialType(CreateProductItemDto) {
  @ApiProperty({ example: 'string' })
  nft_id?: string;
}
