import { ApiProperty, PartialType } from '@nestjs/swagger';
import { transferStatus } from '../../common/const';
import { CreateProductItemTransferDto } from './create-product-item-transfer.dto';

export class UpdateProductItemTransferDto extends PartialType(
  CreateProductItemTransferDto,
) {
  @ApiProperty({ description: '转赠后的藏品ID', example: 'string' })
  target_product_item_id?: string;

  @ApiProperty({ description: '操作ID', example: 'string' })
  operation_id?: string;

  @ApiProperty({
    description: '转赠状态',
    enum: transferStatus,
    example: transferStatus.SUCCESS,
  })
  status?: transferStatus;

  @ApiProperty({ description: '转赠交易哈希', example: 'string' })
  tx_hash?: string;

  @ApiProperty({ description: '转赠成功实践', example: new Date() })
  tx_success_time?: Date;
}
