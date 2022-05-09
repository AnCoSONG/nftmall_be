import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      // Joi只验证Body参数
      return value;
    }
    const { error } = this.schema.validate(value);
    if (error) {
      // 生产环境 不展示详细信息，开发环境展示详细错误
      throw new BadRequestException(
        process.env.NODE_ENV === 'prod' ? 'Validation failed' : error.message,
      );
    }
    return value;
  }
}
