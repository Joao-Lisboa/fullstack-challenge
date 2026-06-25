import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import type { Channel, ConsumeMessage } from "amqplib";
import {
  RoutingKeys,
  WalletOperationFailedEvent,
  WalletOperationResultEvent,
} from "@crash/events";
import { WalletOperationResultHandler } from "../../application/handlers/wallet-operation-result.handler";
import { RabbitMqConnection } from "./rabbitmq.connection";

const QUEUE_NAME = "games.wallet-results";

@Injectable()
export class WalletResultsConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(WalletResultsConsumer.name);

  constructor(
    private readonly rabbitMqConnection: RabbitMqConnection,
    private readonly handler: WalletOperationResultHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const channel = this.rabbitMqConnection.getChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, "crash.events", RoutingKeys.DEBIT_COMPLETED);
    await channel.bindQueue(QUEUE_NAME, "crash.events", RoutingKeys.DEBIT_FAILED);

    await channel.consume(QUEUE_NAME, (message) => {
      void this.handleMessage(message, channel);
    });
  }

  private async handleMessage(message: ConsumeMessage | null, channel: Channel): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const routingKey = message.fields.routingKey;

      if (routingKey === RoutingKeys.DEBIT_COMPLETED) {
        const payload = JSON.parse(message.content.toString()) as WalletOperationResultEvent;
        await this.handler.handleDebitCompleted(payload);
      } else if (routingKey === RoutingKeys.DEBIT_FAILED) {
        const payload = JSON.parse(message.content.toString()) as WalletOperationFailedEvent;
        await this.handler.handleDebitFailed(payload);
      }

      channel.ack(message);
    } catch (error) {
      this.logger.error("Failed to process wallet result event", error);
      channel.nack(message, false, false);
    }
  }
}
