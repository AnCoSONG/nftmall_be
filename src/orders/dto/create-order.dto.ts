import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 123 })
  buyer_id: number;

  @ApiProperty({ example: 'qweqewqe' })
  product_item_id: string;

  //   @ApiProperty()
  //   gen_credit: number;
}
