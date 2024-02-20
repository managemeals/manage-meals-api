import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const envSchema = {
  type: "object",
  required: ["MONGO_URL", "REDIS_URL", "ES_HOST"],
  properties: {
    MONGO_URL: {
      type: "string",
    },
    REDIS_URL: {
      type: "string",
    },
    ES_HOST: {
      type: "string",
    },
  },
};

const envOptions = {
  confKey: "config",
  schema: envSchema,
  dotenv: true,
};

const env = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyEnv, envOptions);
};

export default fastifyPlugin(env);
