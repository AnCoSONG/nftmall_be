import { Test, TestingModule } from '@nestjs/testing';
import { CryptoJsProvider } from './crypto-js.provider';

describe('CryptoJsProvider', () => {
  let provider: CryptoJsProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoJsProvider],
    }).compile();

    provider = module.get<CryptoJsProvider>(CryptoJsProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
