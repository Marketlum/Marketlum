import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
