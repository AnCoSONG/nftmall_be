import { Test, TestingModule } from '@nestjs/testing';
import { AffairService } from './affair.service';

describe('AffairService', () => {
  let service: AffairService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AffairService],
    }).compile();

    service = module.get<AffairService>(AffairService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
