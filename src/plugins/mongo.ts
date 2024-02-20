import fastifyMongodb from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const mongo = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyMongodb, {
    forceClose: true,
    url: fastify.config.MONGO_URL,
  });
};

export default fastifyPlugin(mongo);
