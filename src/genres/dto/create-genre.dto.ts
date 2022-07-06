import { ApiProperty } from '@nestjs/swagger';

export class CreateGenreDto {
  @ApiProperty({ description: '藏品类别名称', example: '航天系列' })
  name: string;
}
