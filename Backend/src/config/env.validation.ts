import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().default('redis://localhost:6379'),
    KAFKA_BROKERS: Joi.string().default('kafka:9092'),
    PORT: Joi.number().default(3000),
    BASE_URL: Joi.string().default('http://localhost:3000'),
    FRONTEND_URL: Joi.string().default('http://localhost:3001'),
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
});
