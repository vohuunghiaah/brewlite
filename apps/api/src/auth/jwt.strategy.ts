import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { jwtConfig } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    config: ConfigType<typeof jwtConfig>,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['HS256'],
      ignoreExpiration: false,
      secretOrKey: config.secret,
    });
  }

  validate(payload: unknown) {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub) ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number' ||
      !Number.isSafeInteger(payload.exp)
    ) {
      throw new UnauthorizedException();
    }

    const id = Number(payload.sub);
    if (id > 2_147_483_647) {
      throw new UnauthorizedException();
    }

    return this.auth.findAccount(id);
  }
}
