import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { IGlobalConfig } from "../types.js";

const fastifyGlobalConfig = fastifyPlugin(
  async (fastify: FastifyInstance, options: IGlobalConfig) => {
    fastify.decorate("globalconfig", options);
  }
);

export { fastifyGlobalConfig };

const globalConfig = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyGlobalConfig, {
    isLbShutdown: false,
  });
};

export default fastifyPlugin(globalConfig);
