import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import fastifyHelmet from '@fastify/helmet';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCompress from '@fastify/compress';
import { fastifyCookie } from '@fastify/cookie';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({ logger: true });
  fastifyAdapter.register(fastifyHelmet);
  fastifyAdapter.register(fastifyCompress);
  fastifyAdapter.register(fastifyCookie, {
    secret: 'anco',
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      cors: {
        origin:
          process.env.NODE_ENV === 'dev'
            ? 'http://localhost:3000'
            : 'https://jinyuanshuzi.com',
        credentials: true,
      },
    },
  );
  await app.listen(5000);
}
bootstrap();
