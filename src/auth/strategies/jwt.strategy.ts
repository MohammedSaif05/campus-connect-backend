import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called after JWT is verified. The returned object is attached to request.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    return {
      userId: payload.userId,
      collegeId: payload.collegeId,
      role: payload.role,
      isTutor: payload.isTutor,
      departmentId: payload.departmentId,
    };
  }
}
