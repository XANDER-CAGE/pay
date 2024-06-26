import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from './common/exception-filters/http.exception-filter.js';
import { join } from 'path';

const port = process.env.PORT;
const nodeEnv = process.env.NODE_ENV;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'verbose', 'debug'],
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
  
  await app.listen(port, () => console.log(`Running on port ${port} 🏃 at ${now.toISOString()}`));

}
bootstrap();
