import Fastify from "fastify";
import routes from "./routes.js";
import env from "./plugins/env.js";
import mongo from "./plugins/mongo.js";
import redis from "./plugins/redis.js";

const fastify = Fastify({
  logger: true,
});

fastify.register(env);
fastify.register(mongo);
fastify.register(redis);
fastify.register(routes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
