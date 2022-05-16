import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PaymentStatus } from '../../common/const';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiProperty({ example: new Date() })
  pay_timestamp?: Date;

  @ApiProperty({ example: '0.00' })
  gen_credit?: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  payment_status?: PaymentStatus;
}
