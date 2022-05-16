import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { BsnService } from './bsn/bsn.service';
// import { FastifyReply } from 'fastify';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly bsnService: BsnService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/test-redis')
  testRedis() {
    return this.appService.testRedis();
  }

  @Get('/test')
  test() {
    return this.bsnService.create_nft_class({
      owner: 'iaa1u7gdwe54dz5y0gtw275fl558u0x2c9cju9xryz',
      name: 'testNFTclass',
      symbol: 'testsymbol',
      description: 'testdesc',
      uri: 'https://www.baidu.com',
      uri_hash:
        'bc5c3283cae3c6567656b6a52bd8b31a806da655336169b611ad9ab790581364',
      data: '12345testdata',
      tag: {
        key123: 'testkey1',
        key234: 'testkey2',
      },
    });
  }
  @Get('/test2')
  test2() {
    // return this.bsnService.get_transactions(
    //   '620FA1C5E0A1DF97CD09BA4E6E3F50487142FFCEB7F05A9C576FD34CAC9E843D',
    // );
    return this.bsnService.get_transactions('xfcvimgcuq11ro4128p8');
  }

  @Get('/test3')
  test3() {
    return this.bsnService.get_accounts(
      'iaa1u7gdwe54dz5y0gtw275fl558u0x2c9cju9xryz',
    );
    // return this.bsnService.get_accounts();
  }

  @Get('/test4')
  test4() {
    return this.bsnService.get_accounts_history(
      'iaa1u7gdwe54dz5y0gtw275fl558u0x2c9cju9xryz',
    );
  }

  @Get('/test5')
  test5() {
    return this.bsnService.get_nft_class({
      id: 'avata954e1683f77c59581a5d0f69daa616600655713bccbb7c54eb6c6a6ba529fc21',
    });
  }
}
