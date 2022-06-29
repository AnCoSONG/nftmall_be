import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCollectorDto } from './create-collector.dto';

export class UpdateCollectorDto extends PartialType(CreateCollectorDto) {
  @ApiProperty({ description: '邮箱', example: null })
  email?: string | null;
  @ApiProperty({ description: '真实姓名', example: null })
  real_name?: string | null;

  @ApiProperty({ description: '身份证', example: null })
  real_id?: string | null;
  @ApiProperty({
    description: 'BSN钱包地址',
    example: '1231213128381sw1ey21hd12h8gd19',
  })
  bsn_address?: string;
  @ApiProperty({ description: '积分', example: 1 })
  credit?: number;

  @ApiProperty({ description: '微信账号ID' })
  wx_openid?: string;
}
