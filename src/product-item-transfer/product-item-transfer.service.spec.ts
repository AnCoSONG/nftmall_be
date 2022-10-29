import { Test, TestingModule } from '@nestjs/testing';
import { ProductItemTransferService } from './product-item-transfer.service';

describe('ProductItemTransferService', () => {
  let service: ProductItemTransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductItemTransferService],
    }).compile();

    service = module.get<ProductItemTransferService>(ProductItemTransferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
