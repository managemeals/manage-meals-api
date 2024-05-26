import { FastifyInstance } from "fastify";
import mealPlans from "./meal-plans.js";

const premium = async (fastify: FastifyInstance, options: Object) => {
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.user || request.user.subscriptionType !== "PREMIUM") {
      reply.code(401);
      throw new Error("User does not have Premium subscription");
    }
  });

  await fastify.register(mealPlans, { prefix: "/meal-plans" });
};

export default premium;
