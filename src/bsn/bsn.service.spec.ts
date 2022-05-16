import { Test, TestingModule } from '@nestjs/testing';
import { BsnService } from './bsn.service';

describe('BsnProvider', () => {
  let service: BsnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BsnService],
    }).compile();

    service = module.get<BsnService>(BsnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
