import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  KAFKA_BROKERS: Joi.string().default('kafka:9092'),
  PORT: Joi.number().default(3000),
  BASE_URL: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  // No insecure fallback in production — anyone knowing the default could forge tokens
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('dev-only-insecure-jwt-secret'),
  }),
  GOOGLE_SAFE_BROWSING_API_KEY: Joi.string().allow('').optional(),
});
