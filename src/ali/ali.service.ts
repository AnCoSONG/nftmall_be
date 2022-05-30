import { Inject, Injectable } from '@nestjs/common';
import { ALI_SYMBOL } from './ali.provider';
import Dysmsapi20170525, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { RuntimeOptions } from '@alicloud/tea-util';

@Injectable()
export class AliService {
  constructor(
    @Inject(ALI_SYMBOL) private readonly aliClient: Dysmsapi20170525,
  ) {}

  async sendCode(phone: string, code: string) {
    const sms_request = new SendSmsRequest({
      signName: '晋元数字',
      templateCode: 'SMS_242870473',
      phoneNumbers: phone,
      templateParam: `{"code":"${code}"}`,
    });
    const runtime = new RuntimeOptions();
    const res = await this.aliClient.sendSmsWithOptions(sms_request, runtime);
    return res.body;
  }
}
