import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CollectorsModule } from '../collectors/collectors.module';
import { JwtModule } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AliModule } from '../ali/ali.module';
import { JwtGuard } from './guards/jwt.guard';

@Module({
  imports: [
    forwardRef(() => CollectorsModule),
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
    AliModule,
  ],
  providers: [AuthService, JwtGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtGuard],
})
export class AuthModule {}
