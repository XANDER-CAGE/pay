import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from 'src/common/config/env.config';
const rmqUser = env.RABBITMQ_USER;
const rmqPassword = env.RABBITMQ_PASSWORD;

export const hookQueueServiceName = 'HOOK_SERVICE';
export const hookQueue = ClientsModule.register([
  {
    name: hookQueueServiceName,
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rmqUser}:${rmqPassword}@localhost:5672`],
      queue: 'hook_queue',
    },
  },
]);
