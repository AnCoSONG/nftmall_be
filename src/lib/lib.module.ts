import { Global, Module } from '@nestjs/common';
import { DayjsProvider } from './dayjs/dayjs.provider';
import { DayjsService } from './dayjs/dayjs.service';
import { WxpayProvider } from './wxpay.provider';
import { CryptoJsProvider } from './crypto-js/crypto-js.provider';
import { CryptoJsService } from './crypto-js/crypto-js.service';

@Global()
@Module({
  providers: [
    DayjsProvider,
    DayjsService,
    WxpayProvider,
    CryptoJsProvider,
    CryptoJsService,
  ],
  exports: [
    DayjsProvider,
    DayjsService,
    WxpayProvider,
    CryptoJsProvider,
    CryptoJsService,
  ],
})
export class LibModule {}
