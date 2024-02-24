import Fastify from "fastify";
import { Transporter } from "nodemailer";
import { JwtPayload, SignOptions, default as jwtLib } from "jsonwebtoken";
import { User } from "./src/types.ts";

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
    };

    mailer: Transporter;

    bcrypt: {
      hash: (pwd: string) => Promise<string>;
      compare: (data: string, hash: string) => Promise<boolean>;
    };

    jwt: {
      sign: (payload: object, secret: string, opts: SignOptions) => string;
      verify: <T>(token: string, secret: string) => T & JwtPayload;
    };

    slugify: (string: string, options?: Options) => string;
  }

  interface FastifyRequest {
    user?: User;
  }
}
