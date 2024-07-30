import { FastifyInstance } from "fastify";

const premium = async (fastify: FastifyInstance, options: Object) => {
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.user || request.user.subscriptionType !== "PREMIUM") {
      reply.code(401);
      throw new Error("User does not have Premium subscription");
    }
  });
};

export default premium;
