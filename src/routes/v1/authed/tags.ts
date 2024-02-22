import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";

const tags = async (fastify: FastifyInstance, options: Object) => {
  const tagsSchema: FastifySchema = {};

  fastify.get(
    "/",
    { schema: tagsSchema },
    async (request: FastifyRequest<{ Body: any }>, reply) => {
      return { user: request.user || { ok: "nice" } };
    }
  );
};

export default tags;
