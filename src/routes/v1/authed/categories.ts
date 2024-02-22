import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";

const categories = async (fastify: FastifyInstance, options: Object) => {
  const categoriesSchema: FastifySchema = {};

  fastify.get(
    "/",
    { schema: categoriesSchema },
    async (request: FastifyRequest<{ Body: any }>, reply) => {
      return { user: request.user || { ok: "nice" } };
    }
  );
};

export default categories;
