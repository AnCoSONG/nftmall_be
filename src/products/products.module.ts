import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Genre } from '../genres/entities/genre.entity';
import { BsnModule } from '../bsn/bsn.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Genre]), BsnModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
