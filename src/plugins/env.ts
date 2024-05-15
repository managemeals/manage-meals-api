import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const envSchema = {
  type: "object",
  required: ["MONGO_URL", "MONGO_DB", "REDIS_URL"],
  properties: {
    MONGO_URL: {
      type: "string",
    },
    MONGO_DB: {
      type: "string",
    },
    REDIS_URL: {
      type: "string",
    },
    PASSWORD_MIN_LENGTH: {
      type: "number",
      default: 6,
    },
    SMTP_HOST: {
      type: "string",
    },
    SMTP_USER: {
      type: "string",
    },
    SMTP_PASS: {
      type: "string",
    },
    SMTP_PORT: {
      type: "number",
    },
    SMTP_DEFAULT_FROM: {
      type: "string",
    },
    BCRYPT_SALT_ROUNDS: {
      type: "number",
    },
    EMAIL_VERIFY_JWT_SECRET: {
      type: "string",
    },
    EMAIL_VERIFY_JWT_EXPIRE_SEC: {
      type: "number",
    },
    APP_URL: {
      type: "string",
    },
    ACCESS_JWT_SECRET: {
      type: "string",
    },
    REFRESH_JWT_SECRET: {
      type: "string",
    },
    AUTH_ACCESS_TOKEN_EXPIRE_SEC: {
      type: "number",
    },
    AUTH_REFRESH_TOKEN_EXPIRE_SEC: {
      type: "number",
    },
    RESET_PASS_JWT_SECRET: {
      type: "string",
    },
    RESET_PASS_JWT_EXPIRE_SEC: {
      type: "number",
    },
    ITEMS_PER_PAGE: {
      type: "number",
    },
    RECIPE_SCRAPER_URL: {
      type: "string",
    },
    INFRA_ENDPOINT_KEY: {
      type: "string",
    },
    S3_KEY: {
      type: "string",
    },
    S3_SECRET: {
      type: "string",
    },
    S3_ENDPOINT: {
      type: "string",
    },
    S3_REGION: {
      type: "string",
    },
    S3_BUCKET: {
      type: "string",
    },
    RABBITMQ_URL: {
      type: "string",
    },
    TYPESENSE_HOST: {
      type: "string",
    },
    TYPESENSE_PORT: {
      type: "number",
    },
    TYPESENSE_API_KEY: {
      type: "string",
    },
    MOCK_INSTANCE: {
      type: "string",
    },
    MOCK_ALLOWED_URLS: {
      type: "string",
    },
    HELP_CONTACT_EMAIL: {
      type: "string",
    },
    GOCARDLESS_ACCESS_TOKEN: {
      type: "string",
    },
    GOCARDLESS_ENV: {
      type: "string",
    },
    GOCARDLESS_REDIRECT_URI: {
      type: "string",
    },
    GOCARDLESS_EXIT_URI: {
      type: "string",
    },
    GOCARDLESS_WEBHOOK_SECRET: {
      type: "string",
    },
    DEFAULT_RECIPE_IMG: {
      type: "string",
    },
    MAX_FILE_SIZE_BYTES: {
      type: "number",
    },
  },
};

const envOptions = {
  confKey: "config",
  schema: envSchema,
  dotenv: {
    path: process.env.APP_ENV === "production" ? ".env" : ".env.local",
    debug: process.env.APP_ENV !== "production",
  },
};

const env = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyEnv, envOptions);
};

export default fastifyPlugin(env);
