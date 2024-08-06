import { FastifyInstance } from "fastify";
import env from "./plugins/env.js";
import mongo from "./plugins/mongo.js";
import redis from "./plugins/redis.js";
import v1 from "./routes/v1/index.js";
import bcrypt from "./plugins/bcrypt.js";
import jwt from "./plugins/jwt.js";
import slugify from "./plugins/slugify.js";
import infra from "./routes/infra/index.js";
import amqp from "./plugins/amqp.js";
import typesense from "./plugins/typesense.js";
import gocardless from "./plugins/gocardless.js";
import webhooks from "./routes/webhooks/index.js";
import globalconfig from "./plugins/globalconfig.js";
import multipart from "./plugins/multipart.js";
import s3 from "./plugins/s3.js";
import axios from "./plugins/axios.js";

const app = async (fastify: FastifyInstance, options: Object) => {
  fastify.addHook("preHandler", async (request, reply) => {
    if (
      fastify.config.MOCK_INSTANCE === "yes" &&
      request.method !== "GET" &&
      !fastify.config.MOCK_ALLOWED_URLS.split(",").includes(request.url)
    ) {
      reply.code(403);
      throw new Error("Mock instance only allows GET requests");
    }
  });

  fastify.addHook("onRequest", async (request, reply) => {
    if (request.raw.url && !request.raw.url.startsWith("/infra/health")) {
      request.log.info(
        { url: request.raw.url, id: request.id },
        "received request"
      );
    }
  });

  fastify.addHook("onResponse", async (request, reply) => {
    if (request.raw.url && !request.raw.url.startsWith("/infra/health")) {
      request.log.info(
        { url: request.raw.url, statusCode: reply.raw.statusCode },
        "request completed"
      );
    }
  });

  await fastify.register(env);
  await fastify.register(mongo);
  await fastify.register(redis);
  // await fastify.register(mailer);
  await fastify.register(bcrypt);
  await fastify.register(jwt);
  await fastify.register(slugify);
  if (fastify.config.S3_KEY) {
    await fastify.register(s3);
  }
  if (fastify.config.RABBITMQ_URL) {
    await fastify.register(amqp);
  }
  await fastify.register(typesense);
  if (fastify.config.GOCARDLESS_ACCESS_TOKEN) {
    await fastify.register(gocardless);
  }
  await fastify.register(multipart);
  await fastify.register(axios);
  await fastify.register(globalconfig);
  await fastify.register(infra, { prefix: "/infra" });
  await fastify.register(webhooks, { prefix: "/webhooks" });
  await fastify.register(v1, { prefix: "/v1" });
};

export default app;
