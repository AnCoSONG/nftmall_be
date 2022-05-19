import { Global, Module } from '@nestjs/common';
import { DayjsProvider } from './dayjs/dayjs.provider';
import { DayjsService } from './dayjs/dayjs.service';
import { WxpayProvider } from './wxpay.provider';

@Global()
@Module({
  providers: [DayjsProvider, DayjsService, WxpayProvider],
  exports: [DayjsProvider, DayjsService, WxpayProvider],
})
export class LibModule {}
