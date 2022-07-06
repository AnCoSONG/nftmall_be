import { ApiProperty } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({
    description: '图像链接',
    example: 'https://picsum.photos/200/300',
    required: true,
  })
  src: string;
  @ApiProperty({
    description: '点击后前往哪个页面',
    example: null,
  })
  link?: string;
}
