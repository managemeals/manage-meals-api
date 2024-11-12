import Fastify from "fastify";
import { Transporter } from "nodemailer";
import { JwtPayload, SignOptions, default as jwtLib } from "jsonwebtoken";
import { IDbUser, IGlobalConfig } from "./src/types.ts";
import { S3Client } from "@aws-sdk/client-s3";
import amqplib from "amqplib";
import { Client as TypesenseClient } from "typesense";
import { Faker } from "@faker-js/faker";
import { AxiosInstance } from "axios";
import { SlugifyOptions } from "./src/plugins/slugify.js";

declare module "fastify" {
    interface FastifyInstance {
        config: {
            MONGO_URL: string;
            MONGO_DB: string;
            REDIS_URL: string;
            PASSWORD_MIN_LENGTH: number;
            SMTP_HOST: string;
            SMTP_USER: string;
            SMTP_PASS: string;
            SMTP_PORT: number;
            SMTP_DEFAULT_FROM: string;
            BCRYPT_SALT_ROUNDS: number;
            EMAIL_VERIFY_JWT_SECRET: string;
            EMAIL_VERIFY_JWT_EXPIRE_SEC: number;
            APP_URL: string;
            ACCESS_JWT_SECRET: string;
            REFRESH_JWT_SECRET: string;
            AUTH_ACCESS_TOKEN_EXPIRE_SEC: number;
            AUTH_REFRESH_TOKEN_EXPIRE_SEC: number;
            RESET_PASS_JWT_SECRET: string;
            RESET_PASS_JWT_EXPIRE_SEC: number;
            ITEMS_PER_PAGE: number;
            RECIPE_SCRAPER_URL: string;
            INFRA_ENDPOINT_KEY: string;
            S3_KEY: string;
            S3_SECRET: string;
            S3_ENDPOINT: string;
            S3_REGION: string;
            S3_BUCKET: string;
            RABBITMQ_URL: string;
            TYPESENSE_HOST: string;
            TYPESENSE_PORT: number;
            TYPESENSE_API_KEY: string;
            MOCK_INSTANCE: string;
            MOCK_ALLOWED_URLS: string;
            HELP_CONTACT_EMAIL: string;
            GOCARDLESS_ACCESS_TOKEN: string;
            GOCARDLESS_ENV: string;
            GOCARDLESS_REDIRECT_URI: string;
            GOCARDLESS_EXIT_URI: string;
            GOCARDLESS_WEBHOOK_SECRET: string;
            DEFAULT_RECIPE_IMG: string;
            MAX_FILE_SIZE_BYTES: number;
            PAYPAL_APP_CLIENT_ID: string;
            PAYPAL_APP_SECRET: string;
            PAYPAL_API_URL: string;
            PREMIUM_PRICE_PENNIES: number;
            EMAIL_VERIFY_ENABLED: boolean;
            PROCESS_USER_POST_REGISTER: boolean;
            PROCESS_IMAGE_POST_IMPORT: boolean;
            USER_REGISTER_ENABLED: boolean;
            OAUTH_GOOGLE_CLIENT_ID: string;
            OAUTH_GOOGLE_CLIENT_SECRET: string;
            OAUTH_GOOGLE_CALLBACK_URI: string;
            OAUTH_FACEBOOK_CLIENT_ID: string;
            OAUTH_FACEBOOK_CLIENT_SECRET: string;
            OAUTH_FACEBOOK_CALLBACK_URI: string;
            MULTIPLE_MOCK_USERS: boolean;
        };

        mailer: Transporter;

        bcrypt: {
            hash: (pwd: string) => Promise<string>;
            compare: (data: string, hash: string) => Promise<boolean>;
        };

        jwt: {
            sign: (
                payload: object,
                secret: string,
                opts: SignOptions,
            ) => string;
            verify: <T>(token: string, secret: string) => T & JwtPayload;
        };

        slugify: (str: string, options?: SlugifyOptions) => string;

        s3: S3Client;

        amqp: {
            connection: amqplib.Connection;
            channel: amqplib.Channel;
        };

        typesense: TypesenseClient;

        faker: Faker;

        gocardless: any;

        globalconfig: IGlobalConfig;

        axios: AxiosInstance;

        googleOAuth2: any;

        facebookOAuth2: any;
    }

    interface FastifyRequest {
        user?: IDbUser;
    }
}
