import fastifyElasticsearch from "@fastify/elasticsearch";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const elasticsearch = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyElasticsearch, {
    node: fastify.config.ES_HOST,
  });
};

export default fastifyPlugin(elasticsearch);
