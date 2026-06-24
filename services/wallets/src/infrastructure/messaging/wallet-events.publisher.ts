import { Injectable } from "@nestjs/common";
import { EXCHANGE } from "@crash/events";
import { RabbitMqConnection } from "./rabbitmq.connection";

@Injectable()
export class WalletEventsPublisher {
  constructor(private readonly rabbitMqConnection: RabbitMqConnection) {}

  async publish(routingKey: string, payload: unknown): Promise<void> {
    const channel = this.rabbitMqConnection.getChannel();
    const body = Buffer.from(JSON.stringify(payload));

    channel.publish(EXCHANGE, routingKey, body, {
      contentType: "application/json",
      persistent: true,
    });
  }
}
