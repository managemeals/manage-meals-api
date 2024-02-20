import Fastify from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    config: {
      MONGO_URL: string;
      REDIS_URL: string;
      ES_HOST: string;
    };
  }
}
