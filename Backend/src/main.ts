import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

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

    // Connect Kafka microservice consumer (non-fatal — HTTP API still starts if Kafka is unreachable)
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: 'url-shortener',
                brokers: kafkaBrokers,
                retry: {
                    initialRetryTime: 3000,
                    retries: 10,          // keep retrying until Kafka is ready
                },
            },
            consumer: {
                groupId: 'url-shortener-consumer',
            },
        },
    });

    // Start microservices but don't crash the HTTP server if Kafka isn't up yet
    app.startAllMicroservices().catch((err) => {
        logger.warn(`Kafka consumer failed to start (will retry automatically): ${err.message}`);
    });

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    logger.log(`Application running on port ${port}`);
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
    logger.log(`CORS allowed origin: ${allowedOrigin}`);

}

// Start batch processor in-process (flushes Redis click counters to Postgres every 10s)
import './queue/batch.processor.js';

bootstrap();
