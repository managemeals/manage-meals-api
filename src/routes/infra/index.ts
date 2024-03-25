import { FastifyInstance, FastifyRequest } from "fastify";

const infra = async (fastify: FastifyInstance, options: Object) => {
  interface IInfraPreHandlerQuerystring {
    key: string;
  }

  fastify.addHook(
    "preHandler",
    async (
      request: FastifyRequest<{ Querystring: IInfraPreHandlerQuerystring }>,
      reply
    ) => {
      const { key } = request.query;
      if (!key || key !== fastify.config.INFRA_ENDPOINT_KEY) {
        reply.code(403);
        throw new Error("Invalid infra key");
      }
    }
  );

  fastify.get("/health", async (request, reply) => {
    if (fastify.globalconfig.isLbShutdown) {
      reply.code(503);
      throw new Error("Shutdown");
    }
    return {};
  });

  fastify.get("/shutdown", async (request, reply) => {
    fastify.globalconfig = { ...fastify.globalconfig, isLbShutdown: true };
    return {};
  });

  fastify.get("/startup", async (request, reply) => {
    fastify.globalconfig = { ...fastify.globalconfig, isLbShutdown: false };
    return {};
  });
};

export default infra;
