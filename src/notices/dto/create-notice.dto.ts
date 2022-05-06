import { ApiProperty } from '@nestjs/swagger';

export class CreateNoticeDto {
  @ApiProperty()
  text: string;
}
