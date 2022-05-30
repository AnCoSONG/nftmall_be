import { forwardRef, Global, Module } from '@nestjs/common';
import { CollectorsService } from './collectors.service';
import { CollectorsController } from './collectors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collector } from './entities/collector.entity';
import { BsnModule } from '../bsn/bsn.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { LibModule } from '../lib/lib.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collector]),
    BsnModule,
    LibModule,
    forwardRef(() => AuthModule),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('idcheck.api_url'),
        timeout: 30000,
        headers: {
          Authorization: 'APPCODE ' + configService.get('idcheck.api_code'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CollectorsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
