import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import fastifyHelmet from '@fastify/helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCompress from '@fastify/compress';
import { fastifyCookie } from '@fastify/cookie';
// import fastifyCookie from 'fastify-cookie';
import FastifyCsrf from 'fastify-csrf';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import minimist = require('minimist');
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // todo: production level logger config
  const fastifyAdapter = new FastifyAdapter({ trustProxy: true });
  // fastifyAdapter.register(fastifyCompress);
  // fastifyAdapter.register(fastifyCookie, {
  //   secret: 'anco',
  // });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      cors: {
        origin:
          process.env.NODE_ENV === 'dev'
            ? ['http://localhost:3000', 'http://localhost:3002']
            : ['https://www.jinyuanshuzi.com', 'https://admin-hsxedh93jf4zthd0.jinyuanshuzi.com'],
        credentials: true,
      },
      bufferLogs: false
    },
  );
  // if (process.env.NODE_ENV !== 'dev') {
  //   app.useLogger(app.get(Logger));
  // }
  app.setGlobalPrefix('v1');
  // register is a wrapper for native fastify.register()
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [
          `'self'`,
          `'unsafe-inline'`,
          'cdn.jsdelivr.net',
          'fonts.googleapis.com',
        ],
        fontSrc: [`'self'`, 'fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `cdn.jsdelivr.net`],
      },
    },
  });
  await app.register(fastifyCompress);

  await app.register(fastifyCookie, {
    secret: 'anco',
  });
  app.register(FastifyCsrf, { cookieOpts: { signed: true } });
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Digital Art Mall')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('~api', app, document);
  const argv = minimist(process.argv.slice(2));
  // console.log(argv['port']);
  // console.log(123);
  if (!argv['port']) {
    await app.listen(5001);
  } else {
    await app.listen(argv['port']);
  }
}
bootstrap();
