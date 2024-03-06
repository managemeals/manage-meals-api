import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import Typesense from "typesense";
import { ConfigurationOptions } from "typesense/lib/Typesense/Configuration.js";

const fastifyTypesense = fastifyPlugin(
  async (fastify: FastifyInstance, options: ConfigurationOptions) => {
    const client = new Typesense.Client(options);

    fastify.decorate("typesense", client);
  }
);

export { fastifyTypesense };

const typesense = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyTypesense, {
    nodes: [
      {
        host: fastify.config.TYPESENSE_HOST,
        port: fastify.config.TYPESENSE_PORT,
        protocol: "http",
      },
    ],
    apiKey: fastify.config.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10,
  });
};

export default fastifyPlugin(typesense);
