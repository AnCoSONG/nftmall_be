import { Controller, Logger, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectorsService } from '../collectors/collectors.service';
import { BsnService } from './bsn.service';

@Controller('bsn')
@ApiTags('文昌链服务')
export class BsnController {
  private readonly logger = new Logger(BsnController.name);
  constructor(private readonly bsnService: BsnService) {}
}
