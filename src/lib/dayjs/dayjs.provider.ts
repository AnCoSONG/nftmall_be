import { Provider } from '@nestjs/common';
import * as dayjs from 'dayjs';

export const DAYJS_SYMBOL = Symbol('LIB:DAYJS');

export const DayjsProvider: Provider = {
  provide: DAYJS_SYMBOL,
  useValue: dayjs,
};
