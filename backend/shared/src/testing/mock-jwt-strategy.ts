/**
 * Mock JWT Strategy for Testing
 *
 * This strategy bypasses actual JWT verification and directly extracts
 * the payload from the token, which should be generated using generateTestJwt()
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class MockJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // For testing, we don't care about expiration
      secretOrKey: 'test-secret', // Must match the secret in generateTestJwt()
    });
  }

  /**
   * Validate the JWT payload
   * In testing, we just return the payload as-is since we trust test tokens
   */
  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      tenantId: payload.tenantId,
    };
  }
}

/**
 * Create a mock JWT strategy provider for use in tests
 */
export function createMockJwtStrategyProvider() {
  return {
    provide: 'JWT_STRATEGY',
    useClass: MockJwtStrategy,
  };
}
