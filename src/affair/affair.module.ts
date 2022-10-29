import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { BsnModule } from '../bsn/bsn.module';
import { CollectorsModule } from '../collectors/collectors.module';
import { LibModule } from '../lib/lib.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductItemTransferModule } from '../product-item-transfer/product-item-transfer.module';
import { ProductItemsModule } from '../product-items/product-items.module';
import { ProductsModule } from '../products/products.module';
import { PublishersModule } from '../publishers/publishers.module';
import { AffairController } from './affair.controller';
import { AffairProcessor } from './affair.processor';
import { AffairService } from './affair.service';

@Module({
  imports: [
    BsnModule,
    ProductsModule,
    PublishersModule,
    OrdersModule,
    AuthModule, // import when use jwt guard because jwt guard require auth service
    ProductItemsModule,
    ConfigModule,
    CollectorsModule,
    ProductItemTransferModule,
    BullModule.registerQueue({ name: 'affair' }),
  ],
  controllers: [AffairController],
  providers: [AffairService, AffairProcessor],
})
export class AffairModule {}
