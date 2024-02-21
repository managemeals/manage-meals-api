import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const envSchema = {
  type: "object",
  required: ["MONGO_URL", "MONGO_DB", "REDIS_URL", "ES_HOST"],
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
    ES_HOST: {
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
  },
};

const envOptions = {
  confKey: "config",
  schema: envSchema,
  dotenv: true,
};

const env = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyEnv, envOptions);
};

export default fastifyPlugin(env);
