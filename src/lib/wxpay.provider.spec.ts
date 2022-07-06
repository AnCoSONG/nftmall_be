import { Test, TestingModule } from '@nestjs/testing';
import { WxpayProvider } from './wxpay.provider';

describe('WxpayProvider', () => {
  let provider: WxpayProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WxpayProvider],
    }).compile();

    provider = module.get<WxpayProvider>(WxpayProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
