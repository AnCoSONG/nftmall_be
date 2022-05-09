import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { phoneReg } from '../../common/const';

export class LoginDto {
  @ApiProperty({ description: '手机号', example: '18512855406' })
  phone: string;

  @ApiProperty({ description: '验证码', example: '123456' })
  code: string;
}

export const LoginSchema = Joi.object({
  phone: Joi.string().pattern(phoneReg).required(),
  code: Joi.string().length(6).required(),
});
