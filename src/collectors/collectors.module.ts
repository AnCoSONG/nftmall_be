import { Module } from '@nestjs/common';
import { CollectorsService } from './collectors.service';
import { CollectorsController } from './collectors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collector } from './entities/collector.entity';
import { BsnModule } from '../bsn/bsn.module';

@Module({
  imports: [TypeOrmModule.forFeature([Collector]), BsnModule],
  controllers: [CollectorsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
