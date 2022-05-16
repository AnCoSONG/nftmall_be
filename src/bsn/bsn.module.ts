import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LibModule } from '../lib/lib.module';
import { BsnService } from './bsn.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('bsn.api_url'),
        timeout: 30000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BsnService],
  exports: [BsnService],
})
export class BsnModule {}
