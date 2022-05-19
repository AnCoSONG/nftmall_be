import { Provider } from '@nestjs/common';
import WxPay from 'wechatpay-node-v3';
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const WXPAY_SYMBOL = Symbol('WXPAY_PROVIDER');
export const WxpayProvider: Provider = {
  provide: WXPAY_SYMBOL,
  useFactory: (configService) => {
    return new WxPay({
      appid: configService.get('wxpay.appid'),
      mchid: configService.get('wxpay.mchid'),
      publicKey: readFileSync(join(process.cwd(), './apiclient_cert.pem')), // 公钥
      privateKey: readFileSync(join(process.cwd(), './apiclient_key.pem')), // 秘钥
    });
  },
  inject: [ConfigService],
};
