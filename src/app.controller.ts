import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
// import { FastifyReply } from 'fastify';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/test-redis')
  testRedis() {
    return this.appService.testRedis();
  }
}
