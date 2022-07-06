import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { phoneReg } from '../../common/const';

export class SendCodeDto {
  @ApiProperty({ description: '手机号', example: '18512855406' })
  phone: string;
}

export const SendCodeSchema = Joi.object({
  phone: Joi.string().pattern(phoneReg).required(),
});
