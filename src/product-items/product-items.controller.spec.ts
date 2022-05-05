import { Test, TestingModule } from '@nestjs/testing';
import { ProductItemsController } from './product-items.controller';
import { ProductItemsService } from './product-items.service';

describe('ProductItemsController', () => {
  let controller: ProductItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductItemsController],
      providers: [ProductItemsService],
    }).compile();

    controller = module.get<ProductItemsController>(ProductItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
