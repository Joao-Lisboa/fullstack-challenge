import {
  Injectable,
  Logger,
} from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-rounds.use-case";
import { JwtAuthService } from "../../infrastructure/auth/jwt-auth.service";
import { GameRealtimeService } from "../../infrastructure/realtime/game-realtime.service";
import { WS_EVENTS } from "../../infrastructure/realtime/ws-events.constants";
import { RoundResponseDto } from "../dtos/round-response.dto";

@WebSocketGateway({
  path: "/ws",
  cors: { origin: "*" },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly gameRealtimeService: GameRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.gameRealtimeService.attachServer(server);
    this.logger.log("WebSocket gateway initialized at /ws");
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const user = await this.jwtAuthService.validateToken(token);
      client.data.user = user;

      const round = await this.getCurrentRoundUseCase.execute();
      client.emit(
        WS_EVENTS.ROUND_SYNC,
        round ? RoundResponseDto.fromRound(round) : null,
      );
    } catch (error) {
      this.logger.warn(`WebSocket connection rejected: ${String(error)}`);
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === "string" && queryToken.length > 0) {
      return queryToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }

    return null;
  }
}
