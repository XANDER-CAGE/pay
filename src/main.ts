import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from './common/exception-filters/http.exception-filter.js';
import { join } from 'path';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { env } from './common/config/env.config.js';

const port = env.PORT;
const nodeEnv = env.NODE_ENV;
const rmqUser = env.RABBITMQ_USER;
const rmqPassword = env.RABBITMQ_PASSWORD;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'verbose', 'debug'],
  });
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rmqUser}:${rmqPassword}@localhost:5672`],
      queue: 'hook_queue',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rmqUser}:${rmqPassword}@localhost:5672`],
      queue: 'f_queue',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });
  app.enableCors({
    origin: true,
    allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization'],
    methods: ['GET', 'POST'],
    credentials: true,
  });
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('GPay')
      .setDescription('Public API')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });
    SwaggerModule.setup('swagger', app, document);
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');
  const now = new Date();
  await app.startAllMicroservices();
  await app.listen(port, () =>
    console.log(`Running on port ${port} 🏃 at ${now.toISOString()}`),
  );
}
bootstrap();
