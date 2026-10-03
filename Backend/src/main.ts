import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ChatIoAdapter } from './chat/chat-io.adapter';
import type { EnvConfig } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService<EnvConfig, true>);
  const port = configService.get('PORT', { infer: true });
  const frontendUrl = configService.get('FRONTEND_URL', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  // Detrás de Render/Railway/Vercel el TLS termina en el proxy; hace falta para cookies Secure.
  if (nodeEnv === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  // Socket.IO (/chat): CORS con credenciales para que el navegador envíe las cookies httpOnly.
  app.useWebSocketAdapter(new ChatIoAdapter(app, frontendUrl));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OficiosYa API')
      .setDescription('API de OficiosYa — El Asintal, Retalhuleu')
      .setVersion('0.1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  logger.log(`API OficiosYa escuchando en http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger disponible en http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
