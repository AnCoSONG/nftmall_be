import { Test, TestingModule } from '@nestjs/testing';
import { AffairController } from './affair.controller';

describe('AffairController', () => {
  let controller: AffairController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffairController],
    }).compile();

    controller = module.get<AffairController>(AffairController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
