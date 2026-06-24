import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import amqp, { Channel, ChannelModel } from "amqplib";
import { EXCHANGE } from "@crash/events";

@Injectable()
export class RabbitMqConnection implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>("RABBITMQ_URL");
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE, "topic", { durable: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not initialized");
    }

    return this.channel;
  }
}
