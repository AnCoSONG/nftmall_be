import { Module } from '@nestjs/common';
import { ProductItemTransferService } from './product-item-transfer.service';
import { ProductItemTransferController } from './product-item-transfer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductItemTransfer } from './entities/product-item-transfer.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductItemTransfer]), AuthModule],
  controllers: [ProductItemTransferController],
  providers: [ProductItemTransferService],
  exports: [ProductItemTransferService]
})
export class ProductItemTransferModule {}
