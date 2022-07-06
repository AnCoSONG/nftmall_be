import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BsnService } from './bsn.service';
import { BsnController } from './bsn.controller';

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
  controllers: [BsnController],
})
export class BsnModule {}
