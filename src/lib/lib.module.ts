import { Global, Module } from '@nestjs/common';
import { DayjsProvider } from './dayjs/dayjs.provider';
import { DayjsService } from './dayjs/dayjs.service';

@Global()
@Module({
  providers: [DayjsProvider, DayjsService],
  exports: [DayjsProvider, DayjsService],
})
export class LibModule {}
