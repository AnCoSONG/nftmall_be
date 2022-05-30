import { ApiProperty, PartialType } from '@nestjs/swagger';
import { onChainStatus } from '../../common/const';
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

  @ApiProperty({
    description: '上链状态',
  })
  on_chain_status?: onChainStatus;

  @ApiProperty({ description: 'BSN操作ID' })
  operation_id?: string;

  @ApiProperty({ description: '交易哈希' })
  tx_hash?: string;
}
