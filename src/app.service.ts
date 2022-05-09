import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private redis: Redis) {}
  getHello(): string {
    return 'Hello World!';
  }

  async testRedis(): Promise<string> {
    return await this.redis.ping();
  }
}
