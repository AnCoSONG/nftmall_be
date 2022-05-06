import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectorDto {
  // @ApiProperty({ description: 'ID', example: '1' })
  // id: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({
    description: 'BSN钱包地址',
    example: '1231213128381sw1ey21hd12h8gd19',
  })
  bsn_address: string;

  @ApiProperty({ description: '手机号', example: '13000000000' })
  phone: string;

  @ApiProperty({ description: '邮箱', example: null })
  email: string | null;

  @ApiProperty({
    description: '头像',
    example: 'https://www.baidu.com/img/baidu_jgylogo3.gif',
  })
  avatar: string;

  @ApiProperty({ description: '真实姓名', example: null })
  real_name: string | null;

  @ApiProperty({ description: '身份证', example: null })
  real_id: string | null;

  @ApiProperty({ description: '积分', example: 0.0 })
  credit: number;
}
