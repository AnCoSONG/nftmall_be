import { ApiProperty } from '@nestjs/swagger';
import { DisplayMode } from '../../common/const';

export class CreateTagDto {
  @ApiProperty({ description: '标签文字', example: '测试标签' })
  name: string;

  @ApiProperty({
    description: '显示模式',
    enum: DisplayMode,
    example: DisplayMode.LIGHT,
  })
  mode: DisplayMode;
}
