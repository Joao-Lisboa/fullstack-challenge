import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser } from "./authenticated-user.interface";

interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: configService.getOrThrow<string>("KEYCLOAK_ISSUER"),
      algorithms: ["RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.getOrThrow<string>("KEYCLOAK_JWKS_URI"),
      }),
    });
  }

  validate(payload: KeycloakJwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      username: payload.preferred_username ?? payload.sub,
    };
  }
}
