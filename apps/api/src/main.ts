import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

patchNestJsSwagger();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Protection'],
  });

  const config = new DocumentBuilder()
    .setTitle('Marketlum API')
    .setDescription('API for the Marketlum market framework')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
