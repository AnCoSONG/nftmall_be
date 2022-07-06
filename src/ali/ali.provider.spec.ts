import { Test, TestingModule } from '@nestjs/testing';
import { AliProvider } from './ali.provider';

describe('AliProvider', () => {
  let provider: AliProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AliProvider],
    }).compile();

    provider = module.get<AliProvider>(AliProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
