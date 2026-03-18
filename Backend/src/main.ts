import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Start your background workers synchronously 
// inside the exact same Render server as your API
import './queue/worker.js';
import './queue/batch.processor.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();