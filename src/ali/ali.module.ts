import { Module } from '@nestjs/common';
import { AliService } from './ali.service';
import { AliProvider } from './ali.provider';

@Module({
  providers: [AliService, AliProvider],
  exports: [AliService, AliProvider],
})
export class AliModule {}
