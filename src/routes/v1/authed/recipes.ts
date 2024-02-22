import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";

const recipes = async (fastify: FastifyInstance, options: Object) => {
  const recipesSchema: FastifySchema = {};

  fastify.get(
    "/",
    { schema: recipesSchema },
    async (request: FastifyRequest<{ Body: any }>, reply) => {
      return { user: request.user || { ok: "nice" } };
    }
  );
};

export default recipes;
