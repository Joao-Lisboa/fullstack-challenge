import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import type { Channel, ConsumeMessage } from "amqplib";
import {
  RoutingKeys,
  WalletOperationRequestedEvent,
} from "@crash/events";
import { ProcessWalletOperationHandler } from "../../application/handlers/process-wallet-operation.handler";
import { RabbitMqConnection } from "./rabbitmq.connection";

const QUEUE_NAME = "wallets.operations";

@Injectable()
export class WalletEventsConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(WalletEventsConsumer.name);

  constructor(
    private readonly rabbitMqConnection: RabbitMqConnection,
    private readonly handler: ProcessWalletOperationHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const channel = this.rabbitMqConnection.getChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, "crash.events", RoutingKeys.BET_PLACED);
    await channel.bindQueue(QUEUE_NAME, "crash.events", RoutingKeys.CASHOUT_COMPLETED);

    await channel.consume(QUEUE_NAME, (message) => {
      void this.handleMessage(message, channel);
    });
  }

  private async handleMessage(message: ConsumeMessage | null, channel: Channel): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const payload = JSON.parse(message.content.toString()) as WalletOperationRequestedEvent;

      if (message.fields.routingKey === RoutingKeys.BET_PLACED) {
        await this.handler.handleBetPlaced(payload);
      } else if (message.fields.routingKey === RoutingKeys.CASHOUT_COMPLETED) {
        await this.handler.handleCashoutCompleted(payload);
      }

      channel.ack(message);
    } catch (error) {
      this.logger.error("Failed to process wallet event", error);
      channel.nack(message, false, false);
    }
  }
}
