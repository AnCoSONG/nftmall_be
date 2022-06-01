import { Test, TestingModule } from '@nestjs/testing';
import { BsnController } from './bsn.controller';

describe('BsnController', () => {
  let controller: BsnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BsnController],
    }).compile();

    controller = module.get<BsnController>(BsnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
