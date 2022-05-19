import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BsnModule } from '../bsn/bsn.module';
import { CollectorsModule } from '../collectors/collectors.module';
import { LibModule } from '../lib/lib.module';
import { OrdersModule } from '../orders/orders.module';
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
    ProductItemsModule,
    ConfigModule,
    CollectorsModule,
    BullModule.registerQueue({ name: 'affair' }),
  ],
  controllers: [AffairController],
  providers: [AffairService, AffairProcessor],
})
export class AffairModule {}
