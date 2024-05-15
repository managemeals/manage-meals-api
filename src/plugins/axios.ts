import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { CreateAxiosDefaults, default as axiosLib } from "axios";

const fastifyAxios = fastifyPlugin(
  async (fastify: FastifyInstance, options: CreateAxiosDefaults) => {
    const client = axiosLib.create(options);

    fastify.decorate("axios", client);
  }
);

export { fastifyAxios };

const axios = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyAxios, {
    timeout: 10000,
  });
};

export default fastifyPlugin(axios);
