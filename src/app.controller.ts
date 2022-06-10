import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { BsnService } from './bsn/bsn.service';
import { ThrottlerBehindProxyGuard } from './guards/throttler-behind-proxy.guard';
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

  // 测试限速
  @Get('/test-redis')
  @Throttle(20, 60)
  @UseGuards(ThrottlerBehindProxyGuard)
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
  @Get('/get_transactions')
  test2(@Query('operation_id') operation_id: string) {
    // return this.bsnService.get_transactions(
    //   '620FA1C5E0A1DF97CD09BA4E6E3F50487142FFCEB7F05A9C576FD34CAC9E843D',
    // );
    return this.bsnService.get_transactions(operation_id);
  }

  @Get('/get_accounts')
  test3() {
    // return this.bsnService.get_accounts(
    //   'iaa1u7gdwe54dz5y0gtw275fl558u0x2c9cju9xryz',
    // );
    return this.bsnService.get_accounts({ limit: 50 });
    // return this.bsnService.get_accounts();
  }

  @Get('/get_accounts_history')
  get_accounts_history(@Query('account') account: string) {
    return this.bsnService.get_accounts_history(account);
  }

  @Get('/get_nft_class_detail')
  get_nft_class_detail(@Query('nft_class_id') nft_class_id: string) {
    return this.bsnService.get_nft_class_detail(nft_class_id);
  }

  @Get('/get_nft_detail')
  get_nft(
    @Query('nft_id') nft_id: string,
    @Query('nft_class_id') nft_class_id: string,
  ) {
    return this.bsnService.get_nft_detail(nft_class_id, nft_id);
  }
}
