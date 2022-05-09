import { Module } from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { PublishersController } from './publishers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Publisher } from './entities/publisher.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publisher, Product]), ProductsModule],
  controllers: [PublishersController],
  providers: [PublishersService],
})
export class PublishersModule {}
