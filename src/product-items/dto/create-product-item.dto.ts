import { ApiProperty } from '@nestjs/swagger';

export class CreateProductItemDto {
  @ApiProperty({ example: 'string' })
  product_id: string;

  @ApiProperty({ example: 999 })
  no: number;
}
