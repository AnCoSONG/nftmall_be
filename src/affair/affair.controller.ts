import { Controller } from '@nestjs/common';
import { AffairService } from './affair.service';

@Controller('affair')
export class AffairController {
  constructor(private readonly affairService: AffairService) {}

  // 发布藏品
}
