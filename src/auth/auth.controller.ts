import {
  //   BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JoiValidationPipe } from '../pipes/joi-validation.pipe';
import { AuthService } from './auth.service';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { SendCodeDto, SendCodeSchema } from './dto/send-code.dto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { LocalGuard } from './guards/local.guard';
import { AuthError } from '../common/const';
import { JwtGuard } from './guards/jwt.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('用户鉴权')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/sendCode')
  @UsePipes(new JoiValidationPipe(SendCodeSchema))
  sendCode(@Body() sendCodeDto: SendCodeDto) {
    // Todo: send code to user's phone
    return this.authService.sendCode(sendCodeDto);
  }

  @Post('/login')
  @UseGuards(LocalGuard)
  @UsePipes(new JoiValidationPipe(LoginSchema))
  async login(
    @Req() req: FastifyRequest,
    @Body() loginDto: LoginDto,
    // @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const data = await this.authService.login(loginDto);
    // 手动设置user.auth
    req['user'] = {
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
      code: AuthError.OK,
    };
    // const d = await res.generateCsrf();
    // console.log(d);
    // transform automatically set access_token and refresh_token cookie
    return data.collector;
  }

  @Get('/testJwt')
  @UseGuards(JwtGuard)
  testJwt() {
    return 'hello, you are online.';
  }

  @Get('/fetchUserInfo')
  @UseGuards(JwtGuard)
  async fetchUserInfo(@Req() req: FastifyRequest) {
    const access_token = req.cookies['xc'];
    return await this.authService.fetchUserInfo(access_token);
  }

  //   @Post('/refresh')
  //   async refresh(
  //     @Req() req: FastifyRequest,
  //     @Res({ passthrough: true }) res: FastifyReply,
  //   ) {
  //     const data = await this.authService.refresh(req.cookies['r']);
  //     if (data) {
  //       res.setCookie('r', data.refresh_token, {
  //         httpOnly: true,
  //         maxAge: 1000 * 60 * 60 * 24 * 14, // 2 weeks
  //       });
  //       return { auth: data.access_token };
  //     } else {
  //       throw new BadRequestException('refresh token error');
  //     }
  //   }
}
