import { forwardRef, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectorsModule } from './collectors/collectors.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { ProductItemsModule } from './product-items/product-items.module';
import { OrdersModule } from './orders/orders.module';
import { NoticesModule } from './notices/notices.module';
import { BannersModule } from './banners/banners.module';
import { AdminsModule } from './admins/admins.module';
import { PublishersModule } from './publishers/publishers.module';
import { GenresModule } from './genres/genres.module';
import { CollectionsModule } from './collections/collections.module';
import { BullModule } from '@nestjs/bull';
import config from './config';
import {
  DEFAULT_REDIS_NAMESPACE,
  RedisModule,
  RedisService,
} from '@liaoliaots/nestjs-redis';
import { AuthModule } from './auth/auth.module';
import { BsnModule } from './bsn/bsn.module';
import { LibModule } from './lib/lib.module';
import { AffairModule } from './affair/affair.module';
import { ScheduleModule } from '@nestjs/schedule';
import Redis, { Callback, Result } from 'ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { AliModule } from './ali/ali.module';
import { DocumentsModule } from './documents/documents.module';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

declare module 'ioredis' {
  interface RedisCommander<Context> {
    seckill(
      lucky_set_key: string,
      stock_key: string,
      buy_hash_key: string,
      items_key: string,
      collector_id: number,
      limit: number,
      callback?: Callback<number>,
    ): Result<number, Context>;
    returnStock(
      stock_key: string,
      buy_hash_key: string,
      items_key: string,
      collector_id: string,
      item_no: number,
      callback?: Callback<number>,
    ): Result<number, Context>;
  }
}
@Module({
  imports: [
    // LoggerModule.forRoot({
    //   pinoHttp: {
    //     stream: pino.destination({
    //       dest: './index.log'
    //     })
    //   }
    // }),
    ConfigModule.forRoot({
      // .env 也不应该上传，应该根据Github Action动态生成
      envFilePath: [
        process.env.NODE_ENV === 'dev' ? '.env.dev.local' : '.env.prod.local',
      ],
      isGlobal: true,
      load: [config],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: +configService.get<number>('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // synchronize: process.env.NODE_ENV === 'dev', // 不要动表结构
        // 生产环境务必设置为false
        synchronize: configService.get('database.sync'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get('redis.password'),
          db: +configService.get<number>('redis.queue_db'), // for queue
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        readyLog: true,
        errorLog: true,
        config: {
          retryStrategy: () => 2000,
          host: configService.get('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get('redis.password'),
          db: +configService.get<number>('redis.cache_db'), // for cache
          onClientCreated(client: Redis) {
            client.defineCommand('seckill', {
              //! 目前只能一次购买一个，可以多次购买
              // todo: 修改redis脚本支持多个
              // 1. 库存是否<=0 2. 是否有资格 3. 是否已购买 4. 更新库存 5. 添加用户到buyset 6. 返回新库存
              //lua: `local stock = tonumber(redis.call('get', KEYS[2]))\nif (stock <= 0) then return -1 end\nlocal res1 = redis.call('sismember', KEYS[1], ARGV[1]) \nif (res1 == 0) then return -2 end \nlocal bought = redis.call('sismember',KEYS[3], ARGV[1])\nif (bought == 1) then return -3 end\nlocal newstock = redis.call('decr', KEYS[2]) \n if (newstock < 0) then return -1 end \nredis.call('sadd', KEYS[3], ARGV[1])\nreturn newstock \n`,
              lua: `local stock = tonumber(redis.call('get', KEYS[2]))\nif (stock <= 0) then return -1 end\nlocal qualified = redis.call('sismember', KEYS[1], ARGV[1])\nif (qualified == 0) then return -2 end\nlocal bought_count = redis.call('hget', KEYS[3], ARGV[1])\nif (bought_count == ARGV[2]) then return -3 end\nlocal newstock = redis.call('decr', KEYS[2])\nif (newstock < 0) then return -1 end\nredis.call('hincrby', KEYS[3], ARGV[1], 1)\nlocal item = redis.call('spop', KEYS[4], 1)\nreturn item\n`,
              numberOfKeys: 4,
            });
            client.defineCommand('returnStock', {
              lua: `redis.call('incr', KEYS[1])\nlocal bought_count = tonumber(redis.call('hget', KEYS[2], ARGV[1]))\nif (bought_count < 1) then return -1 end\nredis.call('hincrby', KEYS[2], ARGV[1], -1)\nredis.call('sadd', KEYS[3], ARGV[2])\nreturn 0\n`,
              numberOfKeys: 3,
            });
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      useFactory(redisService: RedisService) {
        const redis = redisService.getClient(DEFAULT_REDIS_NAMESPACE);
        return {
          ttl: 60,
          limit: 10,
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
      inject: [RedisService],
    }),
    CollectorsModule,
    ProductsModule,
    ProductItemsModule,
    OrdersModule,
    NoticesModule,
    BannersModule,
    AdminsModule,
    PublishersModule,
    GenresModule,
    CollectionsModule,
    AuthModule,
    BsnModule,
    LibModule,
    AffairModule,
    ScheduleModule.forRoot(),
    AliModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
