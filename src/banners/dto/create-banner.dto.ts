import { ApiProperty } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty()
  src: number;
  @ApiProperty()
  link: string;
}
