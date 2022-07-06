import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectorDto {

  @ApiProperty({ description: '初始用户名', example: 'test'})
  initial_username: string;
  
  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({ description: '手机号', example: '13000000000' })
  phone: string;

  @ApiProperty({
    description: '头像',
    example: 'https://avatars.dicebear.com/api/pixel-art/random.svg',
  })
  avatar: string;
}

export class IDCheckDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;
  @ApiProperty({ description: '身份证号', example: '420102198001010012' })
  id_card: string;
  @ApiProperty({ description: '姓名', example: '张三' })
  name: string;
}

export class IdProductIdDto {

  @ApiProperty({ description: '产品ID', example: 'string' })
  product_id: string;
}
