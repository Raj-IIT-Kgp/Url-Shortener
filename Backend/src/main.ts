import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Graceful shutdown
    app.enableShutdownHooks();

    // CORS — restrict to the configured frontend origin
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3001';
    app.enableCors({
        origin: allowedOrigin,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization',
        credentials: true,
    });

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    // Swagger / OpenAPI docs at /api/docs
    const swaggerConfig = new DocumentBuilder()
        .setTitle('URL Shortener API')
        .setDescription('REST API for creating and managing short URLs with click analytics')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`Application running on port ${port}`);
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
    logger.log(`CORS allowed origin: ${allowedOrigin}`);
}

// Start background workers in-process (move to separate dyno for production scale)
import './queue/worker.js';
import './queue/batch.processor.js';

bootstrap();
