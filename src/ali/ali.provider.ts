import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import { Config } from '@alicloud/openapi-client';

export const ALI_SYMBOL = Symbol('AliSymbol');
export const AliProvider: Provider = {
  provide: ALI_SYMBOL,
  useFactory: (configService: ConfigService) => {
    const client = new Dysmsapi20170525(new Config({
      accessKeyId: configService.get('aliyun.access_key_id'),
      accessKeySecret: configService.get('aliyun.access_key_secret'),
      endpoint: 'dysmsapi.aliyuncs.com',
    }));
    return client;
  },
  inject: [ConfigService],
};
