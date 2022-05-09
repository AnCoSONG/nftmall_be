import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CollectorsModule } from '../collectors/collectors.module';
import { JwtModule } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CollectorsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // this is for default access token
        secret: configService.get('jwt.access_secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.access_expires_in'),
          algorithm: configService.get<Algorithm>('jwt.access_algorithm'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
