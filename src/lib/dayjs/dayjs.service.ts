import { Inject, Injectable } from '@nestjs/common';
import { DAYJS_SYMBOL } from './dayjs.provider';
import * as Dayjs from 'dayjs'
@Injectable()
export class DayjsService {
  constructor(@Inject(DAYJS_SYMBOL) private readonly dayjs: typeof Dayjs) {}

  gen_time_ms(): number {
    return this.dayjs().valueOf();
  }

  utc_format(utc: any, format?: string): string {
    return this.dayjs(utc).format(format ?? undefined);
  }

  dayjsify(data?: any) {
    return this.dayjs(data);
  }

  date(): Date {
    return this.dayjs().toDate();
  }

  time_expire(unit: 'm' | 'h' | 's' = 'm', value: number = 11) {
    return this.dayjs().add(value, unit).format()
  }
}
