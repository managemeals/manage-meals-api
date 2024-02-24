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
    return {};
  });
};

export default infra;
