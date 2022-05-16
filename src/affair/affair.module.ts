import { Module } from '@nestjs/common';
import { BsnModule } from '../bsn/bsn.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductItem } from '../product-items/entities/product-item.entity';
import { ProductsModule } from '../products/products.module';
import { PublishersModule } from '../publishers/publishers.module';
import { AffairController } from './affair.controller';
import { AffairService } from './affair.service';

@Module({
  imports: [
    BsnModule,
    ProductsModule,
    PublishersModule,
    OrdersModule,
    ProductItem,
  ],
  controllers: [AffairController],
  providers: [AffairService],
})
export class AffairModule {}
