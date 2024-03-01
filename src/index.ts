import Fastify from "fastify";
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
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(env);
await fastify.register(mongo);
await fastify.register(redis);
// await fastify.register(mailer);
await fastify.register(bcrypt);
await fastify.register(jwt);
await fastify.register(slugify);
// await fastify.register(s3);
await fastify.register(amqp);
await fastify.register(typesense);
await fastify.register(infra, { prefix: "/infra" });
await fastify.register(v1, { prefix: "/v1" });

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
