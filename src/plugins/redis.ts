import fastifyRedis from "@fastify/redis";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const redis = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyRedis, {
    url: fastify.config.REDIS_URL,
  });
};

export default fastifyPlugin(redis);
