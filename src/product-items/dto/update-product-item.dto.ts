import { ApiProperty, PartialType } from '@nestjs/swagger';
import { onChainStatus } from '../../common/const';
import { CreateProductItemDto } from './create-product-item.dto';

export class UpdateProductItemDto extends PartialType(CreateProductItemDto) {
  @ApiProperty({ example: 'string' })
  nft_id?: string;

  @ApiProperty({ example: null })
  owner_id?: number;

  @ApiProperty({ example: null })
  nft_class_id?: string;

  @ApiProperty({ example: null })
  operation_id?: string;

  @ApiProperty({ example: onChainStatus.PENDING })
  on_chain_status?: onChainStatus;

  @ApiProperty({example: new Date()})
  on_chain_timestamp?: Date;
}
