import { ApiProperty } from '@nestjs/swagger';
import { onChainStatus, productItemSource, productItemStatus } from '../../common/const';

export class CreateProductItemDto {
  @ApiProperty({ example: 'string' })
  product_id: string;

  @ApiProperty({ example: 999 })
  no: number;

  @ApiProperty({example: null })
  owner_id?: number;

  @ApiProperty({ example: productItemSource.TBD })
  source: productItemSource;

  // === update ⬇️

  @ApiProperty({ example: 'string' })
  nft_id?: string;

  @ApiProperty({ example: null })
  nft_class_id?: string;

  @ApiProperty({ example: null })
  operation_id?: string;

  @ApiProperty({ example: null })
  tx_hash?: string;

  @ApiProperty({ example: onChainStatus.PENDING })
  on_chain_status?: onChainStatus;

  @ApiProperty({ example: new Date() })
  on_chain_timestamp?: Date;

  @ApiProperty({ example: productItemStatus.DEFAULT })
  status?: productItemStatus;
}
