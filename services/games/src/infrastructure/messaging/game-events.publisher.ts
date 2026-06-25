import { Injectable } from "@nestjs/common";
import { EXCHANGE } from "@crash/events";
import { RabbitMqConnection } from "./rabbitmq.connection";

@Injectable()
export class GameEventsPublisher {
  constructor(private readonly rabbitMqConnection: RabbitMqConnection) {}

  async publish(routingKey: string, payload: unknown): Promise<void> {
    const channel = this.rabbitMqConnection.getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  }
}
