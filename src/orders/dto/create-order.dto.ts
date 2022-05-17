import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 123 })
  buyer_id: number;

  @ApiProperty({ example: 'qweqewqe' })
  product_item_id: string;

  @ApiProperty({ example: '0.00' })
  sum_price: string;

  //   @ApiProperty()
  //   gen_credit: number;
}
