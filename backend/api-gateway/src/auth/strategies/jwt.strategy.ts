import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'dev-secret-key-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });

    this.logger.log(`JwtStrategy initialized with secret from ConfigService: ${secret.substring(0, 15)}...`);
  }

  async validate(payload: any) {
    this.logger.debug(`JWT validate called with payload: ${JSON.stringify(payload)}`);

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      this.logger.warn(`User validation failed for userId: ${payload.sub}`);
      throw new UnauthorizedException();
    }

    this.logger.debug(`JWT validation successful for user: ${user.username}`);
    return user;
  }
}
