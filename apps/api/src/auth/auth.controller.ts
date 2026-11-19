import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { CredentialsDto } from './dto/credentials.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() credentials: CredentialsDto) {
    return this.auth.register(credentials);
  }

  @Post('login')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  login(@Body() credentials: CredentialsDto) {
    return this.auth.login(credentials);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
