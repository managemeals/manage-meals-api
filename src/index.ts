import Fastify from "fastify";
import env from "./plugins/env.js";
import mongo from "./plugins/mongo.js";
import redis from "./plugins/redis.js";
import v1 from "./routes/v1/index.js";
import mailer from "./plugins/mailer.js";
import bcrypt from "./plugins/bcrypt.js";
import jwt from "./plugins/jwt.js";
import slugify from "./plugins/slugify.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(env);
await fastify.register(mongo);
await fastify.register(redis);
await fastify.register(mailer);
await fastify.register(bcrypt);
await fastify.register(jwt);
await fastify.register(slugify);
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
