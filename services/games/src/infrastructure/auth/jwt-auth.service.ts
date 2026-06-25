import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { passportJwtSecret } from "jwks-rsa";
import { decode, verify } from "jsonwebtoken";
import type { AuthenticatedUser } from "./authenticated-user.interface";

interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  iss?: string;
}

@Injectable()
export class JwtAuthService {
  private readonly issuer: string;
  private readonly secretProvider: ReturnType<typeof passportJwtSecret>;

  constructor(configService: ConfigService) {
    this.issuer = configService.getOrThrow<string>("KEYCLOAK_ISSUER");
    this.secretProvider = passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: configService.getOrThrow<string>("KEYCLOAK_JWKS_URI"),
    });
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const decoded = decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
      throw new Error("Invalid token");
    }

    const secret = await new Promise<string>((resolve, reject) => {
      this.secretProvider(decoded.header, decoded.payload, (error, key) => {
        if (error || !key) {
          reject(error ?? new Error("Unable to resolve signing key"));
          return;
        }

        resolve(String(key));
      });
    });

    const payload = verify(token, secret, {
      algorithms: ["RS256"],
      issuer: this.issuer,
    }) as KeycloakJwtPayload;

    return {
      userId: payload.sub,
      username: payload.preferred_username ?? payload.sub,
    };
  }
}
