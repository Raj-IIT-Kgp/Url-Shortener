import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka.producer.service';
import { KafkaConsumerService } from './kafka.consumer.service';
import { RedisModule } from '../redis/redis.module';
import { GeoModule } from '../geo/geo.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'KAFKA_CLIENT',
                imports: [ConfigModule],
                useFactory: (config: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: 'url-shortener',
                            brokers: (config.get<string>('KAFKA_BROKERS', 'kafka:9092')).split(','),
                        },
                        consumer: {
                            groupId: 'url-shortener-consumer',
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
        RedisModule,
        GeoModule,
    ],
    controllers: [KafkaConsumerService],
    providers: [KafkaProducerService, PrismaService],
    exports: [KafkaProducerService],
})
export class KafkaModule {}
