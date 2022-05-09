import { Module } from '@nestjs/common';
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
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // .env 也不应该上传，应该根据Github Action动态生成
      envFilePath: ['.env.local', '.env'],
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
          db: 1, // for queue
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // readyLog: true,
        errorLog: true,
        config: {
          host: configService.get('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get('redis.password'),
          db: 0, // for cache
        },
      }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
