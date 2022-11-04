import { Test, TestingModule } from '@nestjs/testing';
import { ProductItemTransferController } from './product-item-transfer.controller';
import { ProductItemTransferService } from './product-item-transfer.service';

describe('ProductItemTransferController', () => {
  let controller: ProductItemTransferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductItemTransferController],
      providers: [ProductItemTransferService],
    }).compile();

    controller = module.get<ProductItemTransferController>(ProductItemTransferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
