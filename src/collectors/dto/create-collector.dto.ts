import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectorDto {
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
