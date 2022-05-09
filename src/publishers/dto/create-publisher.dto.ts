import { ApiProperty } from '@nestjs/swagger';

export class CreatePublisherDto {
  @ApiProperty({ description: '发行商/创作者', example: '创作者' })
  name: string;
}
