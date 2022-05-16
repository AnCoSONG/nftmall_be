import { Inject, Injectable } from '@nestjs/common';
import { DAYJS_SYMBOL } from './dayjs.provider';
@Injectable()
export class DayjsService {
  constructor(@Inject(DAYJS_SYMBOL) private readonly dayjs) {}

  gen_time_ms(): number {
    return this.dayjs().valueOf();
  }

  utc_format(utc: string|number, format: string): string {
    return this.dayjs(utc).format(format);
  }
}
