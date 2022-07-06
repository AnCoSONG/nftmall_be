import { Module } from '@nestjs/common';
import { ProductItemsService } from './product-items.service';
import { ProductItemsController } from './product-items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductItem } from './entities/product-item.entity';
// import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductItem]), ProductsModule, AuthModule],
  controllers: [ProductItemsController],
  providers: [ProductItemsService],
  exports: [ProductItemsService],
})
export class ProductItemsModule {}
