import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const envSchema = {
    type: "object",
    required: [],
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
            default: 10,
        },
        EMAIL_VERIFY_JWT_SECRET: {
            type: "string",
        },
        EMAIL_VERIFY_JWT_EXPIRE_SEC: {
            type: "number",
        },
        APP_URL: {
            type: "string",
            default: "http://localhost:3000",
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
            default: 20,
        },
        RECIPE_SCRAPER_URL: {
            type: "string",
        },
        INFRA_ENDPOINT_KEY: {
            type: "string",
            default: "secret",
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
            default:
                "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/images/default1.jpg",
        },
        MAX_FILE_SIZE_BYTES: {
            type: "number",
            default: 10485760,
        },
        PAYPAL_APP_CLIENT_ID: {
            type: "string",
        },
        PAYPAL_APP_SECRET: {
            type: "string",
        },
        PAYPAL_API_URL: {
            type: "string",
        },
        PREMIUM_PRICE_PENNIES: {
            type: "number",
        },
        EMAIL_VERIFY_ENABLED: {
            type: "boolean",
            default: false,
        },
        PROCESS_USER_POST_REGISTER: {
            type: "boolean",
            default: false,
        },
        PROCESS_IMAGE_POST_IMPORT: {
            type: "boolean",
            default: false,
        },
        USER_REGISTER_ENABLED: {
            type: "boolean",
            default: false,
        },
        OAUTH_GOOGLE_CLIENT_ID: {
            type: "string",
        },
        OAUTH_GOOGLE_CLIENT_SECRET: {
            type: "string",
        },
        OAUTH_GOOGLE_CALLBACK_URI: {
            type: "string",
        },
        OAUTH_FACEBOOK_CLIENT_ID: {
            type: "string",
        },
        OAUTH_FACEBOOK_CLIENT_SECRET: {
            type: "string",
        },
        OAUTH_FACEBOOK_CALLBACK_URI: {
            type: "string",
        },
        OAUTH_FRONTEND_CALLBACK_URL: {
            type: "string",
        },
        MULTIPLE_MOCK_USERS: {
            type: "boolean",
            default: false,
        },
    },
};

const envOptions = {
    confKey: "config",
    schema: envSchema,
    dotenv:
        process.env.APP_ENV !== "production"
            ? {
                  path: ".env",
                  debug: process.env.APP_ENV !== "production",
              }
            : false,
};

const env = async (fastify: FastifyInstance, options: Object) => {
    await fastify.register(fastifyEnv, envOptions);
};

export default fastifyPlugin(env);
